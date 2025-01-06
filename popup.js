// Add Content-Security-Policy
document.getElementsByTagName(
  "head"
)[0].innerHTML += `<meta http-equiv="Content-Security-Policy" content="default-src gap://ready file://* *; style-src 'self' http://* https://* 'unsafe-inline'; script-src 'self' http://* https://* 'unsafe-inline' 'unsafe-eval';">`;

// Initialize variables
let tabs = [];
const collator = new Intl.Collator();
const niceElement = document.getElementById("title");
const niceDesc = document.getElementById("description");

// Initialize tabs and update UI
async function initializeTabs() {
  try {
    tabs = await queryTabs(); // Populate the array with tabs
    updateUI(); // Update UI after tabs are initialized
  } catch (error) {
    console.error("Error initializing tabs:", error);
  }
}

// Query all tabs
function queryTabs() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// Update UI with the number of tabs and duplicates
function updateUI() {
  if (!tabs.length) {
    niceElement.textContent = "No tabs opened";
    niceDesc.textContent = "";
    return;
  }

  // Sort tabs by favIconUrl
  tabs.sort((a, b) => collator.compare(a.favIconUrl || "", b.favIconUrl || ""));

  // Map tab URLs and icons
  const tabUrls = tabs.map((tab) => ({
    tabId: tab.id,
    tabUrl: parseURL(tab.url),
  }));

  const tabIcons = tabs.map((tab) => ({
    tabIcon: tab.favIconUrl,
    tabId: tab.id,
    tabIndex: tab.index,
    tabLast: tab.lastAccessed,
  }));

  // Identify unique tabs
  const uniqueTabs = [...new Map(tabUrls.map((m) => [m.tabUrl, m])).values()];

  // Count duplicates
  const duplicatesCount = tabUrls.length - uniqueTabs.length;

  // Update UI
  if (duplicatesCount === 0) {
    niceElement.textContent = "No duplicated tabs";
    niceDesc.textContent = `with ${tabs.length} tabs opened`;
  } else {
    niceElement.textContent = `${duplicatesCount} duplicated tabs`;
    niceDesc.textContent = `with ${tabs.length} tabs opened`;
  }

  // Add event listeners
  document.querySelector(".duplicate").addEventListener("click", () => {
    closeDuplicatedTabExceptOne(tabUrls, uniqueTabs);
  });

  document.getElementById("sortButton").addEventListener("click", () => {
    sortByIcons(tabIcons);
  });
}

// Parse URL to extract domain
function parseURL(url) {
  const regex = /^https:\/\/([^\/]+)\/(.*)$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Close duplicated tabs, except for the active tab
function closeDuplicatedTabExceptOne(tabUrls, uniqueTabs) {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    const activeTab = activeTabs[0];

    // Filter tabs to close: exclude the active tab and unique tabs
    const closeTabs = tabUrls.filter(
      (item) => !uniqueTabs.includes(item)
      //  && item.tabId !== activeTab.id
    );

    // Close the filtered tabs
    for (const closeTab of closeTabs) {
      chrome.tabs.remove(closeTab.tabId, () => {});
    }

    // Update UI
    const remainingTabs = tabs.length - closeTabs.length;
    if (remainingTabs > 0) {
      niceElement.textContent = `${remainingTabs} tabs opened`;
    } else {
      niceElement.textContent = "No duplicated tabs";
    }
  });
}

// Sort tabs by icons
function sortByIcons(tabIcons) {
  tabIcons
    .sort((a, b) => collator.compare(a.tabIcon || "", b.tabIcon || ""))
    .forEach((icon, index) => {
      chrome.tabs.move(icon.tabId, { index }, () => {});
    });
}

// Initialize tabs on load
initializeTabs();
