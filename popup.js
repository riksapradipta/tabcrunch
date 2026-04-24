// Constants
const UI_ELEMENTS = {
  titleElement: document.getElementById("title"),
  descriptionElement: document.getElementById("description"),
  themeToggleSwitch: document.getElementById("themeToggleSwitch"),
  autoLeftSwitch: document.getElementById("checkNativeSwitch"),
  duplicateButton: document.querySelector(".duplicate"),
  sortButton: document.getElementById("sortButton"),
  autoCloseSwitch: document.getElementById("autoCloseSwitch"),
  autoCloseMinutes: document.getElementById("autoCloseMinutes"),
  saveMinutesBtn: document.getElementById("saveMinutesBtn"),
  minutesDisplayBtn: document.getElementById("minutesDisplayBtn"),
  minutesEditGroup: document.getElementById("minutesEditGroup"),
  preventDuplicatesSwitch: document.getElementById("preventDuplicatesSwitch"),
};

const collator = new Intl.Collator();
let tabs = [];
let autoLeftEnabled = false;
let autoCloseEnabled = false;
let autoCloseMinutes = 5;
let preventDuplicatesEnabled = false;
let themeMode = "system";

// Use modern Promise-based Chrome API wrapper
const queryTabs = () => chrome.tabs.query({});

// Update UI elements with text
const updateUIText = (title, description = "") => {
  UI_ELEMENTS.titleElement.textContent = title;
  UI_ELEMENTS.descriptionElement.textContent = description;
};

const formatAutoCloseLabel = (minutes) => `every ${minutes} min >`;

const applyTheme = (mode) => {
  const resolvedTheme = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;

  document.documentElement.dataset.theme = resolvedTheme;

  if (UI_ELEMENTS.themeToggleSwitch) {
    UI_ELEMENTS.themeToggleSwitch.checked = resolvedTheme === "dark";
  }

  themeMode = mode;
};

const toggleTheme = (event) => {
  const nextTheme = event.target.checked ? "dark" : "light";
  chrome.storage.sync.set({ themeMode: nextTheme });
  applyTheme(nextTheme);
};

// Extract hostname from URL (used for tab grouping display)
const getHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

// Normalize URL for duplicate comparison (removes trailing slash, keeps full path)
const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    // Remove trailing slash from pathname (but keep query and hash)
    let normalized = parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search + parsed.hash;
    return normalized;
  } catch {
    return url;
  }
};

// Extract tab information in a single pass
const extractTabInfo = (tabs) => tabs.reduce((acc, tab) => {
  acc.urls.push({
    tabId: tab.id,
    tabUrl: normalizeUrl(tab.url),  // Normalize URL for accurate duplicate detection
    isActive: tab.active,
    isAudible: tab.audible
  });
  acc.icons.push({
    tabIcon: tab.favIconUrl,
    tabId: tab.id,
    tabIndex: tab.index,
    tabLast: tab.lastAccessed,
  });
  return acc;
}, { urls: [], icons: [] });

// Find duplicates - keeps first occurrence, skips active and audible tabs from being marked as duplicates
const findDuplicates = (urls) => {
  const seen = new Map(); // URL -> first tab info
  const uniqueTabs = [];
  const duplicateTabs = [];

  for (const item of urls) {
    if (!item.tabUrl) continue;

    if (seen.has(item.tabUrl)) {
      // This is a duplicate - only mark for closure if NOT active and NOT playing audio
      if (!item.isActive && !item.isAudible) {
        duplicateTabs.push(item);
      }
      // If this duplicate is active/audible, we should close the original instead (if safe)
      else {
        const original = seen.get(item.tabUrl);
        if (!original.isActive && !original.isAudible && !original.markedForClose) {
          // Move original to duplicates, keep this one as the "unique"
          duplicateTabs.push(original);
          original.markedForClose = true;
          seen.set(item.tabUrl, item);
        }
      }
    } else {
      seen.set(item.tabUrl, item);
      uniqueTabs.push(item);
    }
  }
  return { uniqueTabs, duplicateTabs };
};

// Toggle auto-left setting
const toggleAutoLeft = (event) => {
  autoLeftEnabled = event.target.checked;
  chrome.storage.sync.set({ autoLeftEnabled });
};

// Toggle auto-close duplicates setting
const toggleAutoClose = (event) => {
  autoCloseEnabled = event.target.checked;
  chrome.storage.sync.set({ autoCloseEnabled });
  // Notify service worker to update alarm
  chrome.runtime.sendMessage({
    type: "updateAutoClose",
    enabled: autoCloseEnabled,
    minutes: autoCloseMinutes
  });
};

// Show edit mode for minutes
const showMinutesEdit = () => {
  UI_ELEMENTS.minutesDisplayBtn.style.display = "none";
  UI_ELEMENTS.minutesEditGroup.style.display = "flex";
  UI_ELEMENTS.autoCloseMinutes.focus();
};

// Save auto-close interval when button is clicked
const saveAutoCloseMinutes = () => {
  const minutes = parseInt(UI_ELEMENTS.autoCloseMinutes.value, 10);
  if (minutes >= 1 && minutes <= 60) {
    autoCloseMinutes = minutes;
    chrome.storage.sync.set({ autoCloseMinutes });
    // Notify service worker to update alarm and badge
    chrome.runtime.sendMessage({
      type: "updateAutoClose",
      enabled: autoCloseEnabled,
      minutes: autoCloseMinutes
    });
    // Update display button and hide edit group
    UI_ELEMENTS.minutesDisplayBtn.textContent = formatAutoCloseLabel(minutes);
    UI_ELEMENTS.minutesEditGroup.style.display = "none";
    UI_ELEMENTS.minutesDisplayBtn.style.display = "inline-block";
  }
};

// Close duplicated tabs
const closeDuplicatedTabs = async (duplicateTabs) => {
  if (!duplicateTabs.length) return;

  const tabIds = duplicateTabs.map((tab) => tab.tabId);
  await chrome.tabs.remove(tabIds);

  // Re-query tabs to get the latest count
  tabs = await queryTabs();
  updateUI();
};

// Sort tabs by favicon URL
const sortByIcons = async (tabIcons) => {
  const sorted = [...tabIcons].sort((a, b) =>
    collator.compare(a.tabIcon || "", b.tabIcon || "")
  );

  // Use Promise.all for parallel tab moves where possible
  for (let i = 0; i < sorted.length; i++) {
    await chrome.tabs.move(sorted[i].tabId, { index: i });
  }
  // Re-query tabs to get the latest count/order
  tabs = await queryTabs();
  updateUI();
};

// Update UI with tab count and duplicates
const updateUI = () => {
  if (!tabs.length) {
    updateUIText("No tabs opened");
    return;
  }

  tabs.sort((a, b) => collator.compare(a.favIconUrl || "", b.favIconUrl || ""));
  const { urls, icons } = extractTabInfo(tabs);
  const { uniqueTabs, duplicateTabs } = findDuplicates(urls);

  const statusText = duplicateTabs.length === 0
    ? "No duplicated tabs"
    : `${duplicateTabs.length} duplicated tabs`;
  updateUIText(statusText, `with ${tabs.length} tabs opened`);

  // Store data for event handlers
  UI_ELEMENTS.duplicateButton.onclick = () => closeDuplicatedTabs(duplicateTabs);
  UI_ELEMENTS.sortButton.onclick = () => sortByIcons(icons);
};

// Toggle prevent duplicates setting
const togglePreventDuplicates = (event) => {
  preventDuplicatesEnabled = event.target.checked;
  chrome.storage.sync.set({ preventDuplicatesEnabled });
};

// Initialize extension
const init = async () => {
  try {
    // Load settings and tabs in parallel
    const [storage, queriedTabs] = await Promise.all([
      chrome.storage.sync.get(["autoLeftEnabled", "autoCloseEnabled", "autoCloseMinutes", "preventDuplicatesEnabled", "themeMode"]),
      queryTabs(),
    ]);

    themeMode = storage.themeMode || "system";
    applyTheme(themeMode);
    UI_ELEMENTS.themeToggleSwitch.addEventListener("change", toggleTheme);

    // Auto-left settings
    autoLeftEnabled = storage.autoLeftEnabled || false;
    UI_ELEMENTS.autoLeftSwitch.checked = autoLeftEnabled;
    UI_ELEMENTS.autoLeftSwitch.addEventListener("change", async (e) => {
      toggleAutoLeft(e);
      tabs = await queryTabs();
      updateUI();
    });

    // Auto-close duplicates settings
    autoCloseEnabled = storage.autoCloseEnabled || false;
    autoCloseMinutes = storage.autoCloseMinutes || 5;
    UI_ELEMENTS.autoCloseSwitch.checked = autoCloseEnabled;
    UI_ELEMENTS.autoCloseMinutes.value = autoCloseMinutes;
    UI_ELEMENTS.minutesDisplayBtn.textContent = formatAutoCloseLabel(autoCloseMinutes);
    UI_ELEMENTS.autoCloseSwitch.addEventListener("change", async (e) => {
      toggleAutoClose(e);
      tabs = await queryTabs();
      updateUI();
    });
    UI_ELEMENTS.minutesDisplayBtn.addEventListener("click", showMinutesEdit);
    UI_ELEMENTS.saveMinutesBtn.addEventListener("click", async () => {
      saveAutoCloseMinutes();
      tabs = await queryTabs();
      updateUI();
    });

    // Prevent duplicates settings
    preventDuplicatesEnabled = storage.preventDuplicatesEnabled || false;
    UI_ELEMENTS.preventDuplicatesSwitch.checked = preventDuplicatesEnabled;
    UI_ELEMENTS.preventDuplicatesSwitch.addEventListener("change", async (e) => {
      togglePreventDuplicates(e);
      tabs = await queryTabs();
      updateUI();
    });

    tabs = queriedTabs;
    updateUI();
  } catch (error) {
    console.error("Error initializing tabs:", error);
  }
};

init();
