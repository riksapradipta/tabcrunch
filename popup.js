// Constants
const UI_ELEMENTS = {
  titleElement: document.getElementById("title"),
  descriptionElement: document.getElementById("description"),
};

const collator = new Intl.Collator();
let tabs = [];
let autoLeftEnabled = false;

// Initialize tabs and update UI
async function initializeTabs() {
  try {
    tabs = await queryTabs();
    updateUI();
  } catch (error) {
    console.error("Error initializing tabs:", error);
  }
}

function toggleAutoLeft(event) {
  const isChecked = event.target.checked;
  chrome.storage.sync.set({ autoLeftEnabled: isChecked }, () => {
    autoLeftEnabled = isChecked;
    console.log("Auto left toggled:", autoLeftEnabled);
  });
}

// Load initial state
chrome.storage.sync.get(["autoLeftEnabled"], (result) => {
  autoLeftEnabled = result.autoLeftEnabled || false;
  document.querySelector(".form-switch input").checked = autoLeftEnabled;
});

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

// Update UI elements with text
function updateUIText(title, description = "") {
  UI_ELEMENTS.titleElement.textContent = title;
  UI_ELEMENTS.descriptionElement.textContent = description;
}

// Extract tab information
function extractTabInfo(tabs) {
  return {
    urls: tabs.map((tab) => ({
      tabId: tab.id,
      tabUrl: parseURL(tab.url),
    })),
    icons: tabs.map((tab) => ({
      tabIcon: tab.favIconUrl,
      tabId: tab.id,
      tabIndex: tab.index,
      tabLast: tab.lastAccessed,
    })),
  };
}

// Update UI with the number of tabs and duplicates
function updateUI() {
  if (!tabs.length) {
    updateUIText("No tabs opened");
    return;
  }

  tabs.sort((a, b) => collator.compare(a.favIconUrl || "", b.favIconUrl || ""));
  const { urls, icons } = extractTabInfo(tabs);
  const uniqueTabs = [...new Map(urls.map((m) => [m.tabUrl, m])).values()];
  const duplicatesCount = urls.length - uniqueTabs.length;

  const statusText =
    duplicatesCount === 0
      ? "No duplicated tabs"
      : `${duplicatesCount} duplicated tabs`;
  updateUIText(statusText, `with ${tabs.length} tabs opened`);

  // Add event listeners
  document
    .getElementById("checkNativeSwitch")
    .addEventListener("click", () => toggleAutoLeft);

  document
    .querySelector(".duplicate")
    .addEventListener("click", () =>
      closeDuplicatedTabExceptOne(urls, uniqueTabs)
    );
  document
    .getElementById("sortButton")
    .addEventListener("click", () => sortByIcons(icons));
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
    const closeTabs = tabUrls.filter((item) => !uniqueTabs.includes(item));

    closeTabs.forEach((tab) => chrome.tabs.remove(tab.tabId, () => {}));

    const remainingTabs = tabs.length - closeTabs.length;
    updateUIText(
      remainingTabs > 0 ? `${remainingTabs} tabs opened` : "No duplicated tabs"
    );
  });
}

// Sort tabs by icons
function sortByIcons(tabIcons) {
  tabIcons
    .sort((a, b) => collator.compare(a.tabIcon || "", b.tabIcon || ""))
    .forEach((icon, index) =>
      chrome.tabs.move(icon.tabId, { index }, () => {})
    );
}

// Initialize tabs on load
initializeTabs();
