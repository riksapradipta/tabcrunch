
// Always create context menu on service worker start
function createRemoveDuplicatesMenu() {
  chrome.contextMenus.create({
    id: "remove-duplicated-tabs",
    title: "Remove duplicated tabs",
    contexts: ["page"]
  });
  chrome.contextMenus.create({
    id: "close-domain-tabs",
    title: "Close tabs from this website",
    contexts: ["tab"]
  });
}

createRemoveDuplicatesMenu();
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "remove-duplicated-tabs") {
    // Remove duplicates regardless of autoCloseEnabled
    closeDuplicateTabs(true);
  }
  if (info.menuItemId === "close-domain-tabs") {
    closeDomainTabs(tab.url);
  }
});
const ALARM_NAME = "autoCloseDuplicates";

// Track tabs we've already processed to avoid moving them multiple times
const processedTabs = new Set();

// Normalize URL for comparison
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

// Check if an existing tab with same URL exists and switch to it
async function switchToExistingTab(tabId, url, windowId) {
  const normalizedNewUrl = normalizeUrl(url);
  const allTabs = await chrome.tabs.query({});

  // Find existing tab with same URL (not the current tab)
  const existingTab = allTabs.find(t =>
    t.id !== tabId && normalizeUrl(t.url) === normalizedNewUrl
  );

  if (existingTab) {
    // Switch to the existing tab
    await chrome.tabs.update(existingTab.id, { active: true });
    // Focus the window if it's in a different window
    if (existingTab.windowId !== windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    // Close the new duplicate tab
    await chrome.tabs.remove(tabId);
    return true; // Duplicate was found and handled
  }
  return false; // No duplicate found
}

// Listen for tab URL updates - this fires when the tab actually loads a URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when URL changes and we haven't processed this tab yet
  if (changeInfo.url && !processedTabs.has(tabId)) {
    // Skip chrome:// and edge:// URLs
    if (changeInfo.url.startsWith("chrome://") || changeInfo.url.startsWith("edge://")) {
      return;
    }

    const { autoLeftEnabled, preventDuplicatesEnabled } = await chrome.storage.sync.get([
      "autoLeftEnabled",
      "preventDuplicatesEnabled"
    ]);

    // Check for prevent duplicates first
    if (preventDuplicatesEnabled) {
      const wasDuplicate = await switchToExistingTab(tabId, changeInfo.url, tab.windowId);
      if (wasDuplicate) {
        // Tab was closed, no need to process further
        return;
      }
    }

    // Then handle auto-left grouping
    if (autoLeftEnabled) {
      processedTabs.add(tabId);
      groupTabByDomain(tabId, changeInfo.url, tab.windowId);
    }
  }
});

// Clean up processed tabs when they're closed
chrome.tabs.onRemoved.addListener((tabId) => {
  processedTabs.delete(tabId);
});

// Extract hostname from URL
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Move new tab to be grouped with tabs from the same domain
async function groupTabByDomain(tabId, url, windowId) {
  try {
    const newTabHostname = getHostname(url);
    if (!newTabHostname) return;

    // Get all tabs in the current window
    const allTabs = await chrome.tabs.query({ windowId: windowId });

    // Get current tab info
    const currentTab = allTabs.find(t => t.id === tabId);
    if (!currentTab) return;

    // Find the last index of a tab with the same hostname
    let lastSameHostnameIndex = -1;
    for (const existingTab of allTabs) {
      if (existingTab.id === tabId) continue; // Skip the new tab itself
      const existingHostname = getHostname(existingTab.url);
      if (existingHostname === newTabHostname) {
        lastSameHostnameIndex = Math.max(lastSameHostnameIndex, existingTab.index);
      }
    }

    // If we found tabs with the same hostname, move the new tab right after them
    if (lastSameHostnameIndex >= 0) {
      // Account for the new tab's current position
      const targetIndex = currentTab.index < lastSameHostnameIndex
        ? lastSameHostnameIndex
        : lastSameHostnameIndex + 1;

      // Only move if not already in the right position
      if (currentTab.index !== targetIndex) {
        await chrome.tabs.move(tabId, { index: targetIndex });
      }
    }
    // If no matching tabs found, leave the tab where it is
  } catch (error) {
    if (error.message?.includes("user may be dragging a tab")) {
      setTimeout(() => groupTabByDomain(tabId, url, windowId), 50);
    } else if (!error.message?.includes("No tab with id")) {
      console.error("Error grouping tab:", error);
    }
  }
}

// Close duplicate tabs - skips active tabs and tabs playing media/audio

// If force is true, always remove duplicates regardless of autoCloseEnabled
async function closeDuplicateTabs(force = false) {
  const { autoCloseEnabled } = await chrome.storage.sync.get(["autoCloseEnabled"]);
  if (!force && !autoCloseEnabled) {
    return;
  }

  const tabs = await chrome.tabs.query({});
  const urlMap = new Map();
  const tabsToClose = [];

  for (const tab of tabs) {
    if (!tab.url) continue;

    const normalizedUrl = normalizeUrl(tab.url);

    if (urlMap.has(normalizedUrl)) {
      // This is a duplicate - check if safe to close
      // Skip: active tabs, tabs playing audio/media
      if (!tab.active && !tab.audible) {
        tabsToClose.push(tab.id);
      }
    } else {
      urlMap.set(normalizedUrl, tab.id);
    }
  }

  if (tabsToClose.length > 0) {
    await chrome.tabs.remove(tabsToClose);
    console.log(`Auto-closed ${tabsToClose.length} duplicate tabs`);
  }
}

// Close all other tabs sharing the same domain, keeping active and audible tabs
async function closeDomainTabs(url) {
  const hostname = getHostname(url);
  if (!hostname) return;

  const tabs = await chrome.tabs.query({});
  const toClose = tabs
    .filter(t => t.url && getHostname(t.url) === hostname && !t.active && !t.audible)
    .map(t => t.id);

  if (toClose.length) {
    await chrome.tabs.remove(toClose);
    console.log(`Closed ${toClose.length} tabs from ${hostname}`);
  }
}

// Update the extension badge: red dot if any duplicated tabs, blank otherwise
async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  const urlMap = new Map();
  let hasDuplicate = false;
  for (const tab of tabs) {
    if (!tab.url) continue;
    const normalizedUrl = normalizeUrl(tab.url);
    if (urlMap.has(normalizedUrl)) {
      hasDuplicate = true;
      break;
    }
    urlMap.set(normalizedUrl, tab.id);
  }
  if (hasDuplicate) {
    await chrome.action.setBadgeText({ text: "●" });
    await chrome.action.setBadgeBackgroundColor({ color: "#e53935" }); // Red dot
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

// Setup or update the alarm for auto-closing duplicates
async function setupAutoCloseAlarm() {
  const { autoCloseEnabled, autoCloseMinutes } = await chrome.storage.sync.get([
    "autoCloseEnabled",
    "autoCloseMinutes",
  ]);

  // Clear existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  if (autoCloseEnabled) {
    const minutes = autoCloseMinutes || 5;
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: minutes,
    });
    console.log(`Auto-close alarm set for every ${minutes} minute(s)`);
  } else {
    console.log("Auto-close alarm disabled");
  }

  // Update badge whenever alarm settings change
  updateBadge();
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    closeDuplicateTabs();
  }
});

// Listen for messages from popup to update alarm
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateAutoClose") {
    setupAutoCloseAlarm();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Initialize alarm on service worker start
chrome.runtime.onStartup.addListener(() => {
  setupAutoCloseAlarm();
  updateBadge();
});

// Also setup on install/update
chrome.runtime.onInstalled.addListener(() => {
  setupAutoCloseAlarm();
  updateBadge();
});
