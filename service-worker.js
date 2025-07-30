// Listen for tab events
chrome.tabs.onCreated.addListener((tab) => {
  moveToFirstPosition(tab);
});

function handleActivated(activeInfo) {
  console.log(`Tab ${activeInfo.tabId} was activated`);
}
chrome.tabs.onCreated.addListener(handleActivated);

async function moveToFirstPosition(activeInfo) {
  try {
    await chrome.tabs.move(activeInfo.id, { index: 0 });
    console.log("Success.");
  } catch (error) {
    if (
      error ==
      "Error: Tabs cannot be edited right now (user may be dragging a tab)."
    ) {
      setTimeout(() => moveToFirstPosition(activeInfo), 50);
    } else {
      console.error(error);
    }
  }
}

//if existed tab urls the same as new tab,
// close the new tab and move user to the existing tab
function closeNewTabIfExists(newTabUrl) {
  chrome.tabs.query({}, (tabs) => {
    const existingTab = tabs.find((tab) => tab.url === newTabUrl);
    if (existingTab) {
      console.log("Existing tab found:", existingTab);
      chrome.tabs.remove(chrome.tabs.TAB_ID, () => {
        chrome.tabs.update(existingTab.id, { active: true });
      });
    }
  });
}

//make a timer to close duplicated tabs
function closeDuplicateTabs() {
  console.log("closing tabs");
  chrome.tabs.query({}, (tabs) => {
    let urlCount = {};
    let tabsToClose = [];

    // Count URLs and collect tabs
    tabs.forEach((tab) => {
      if (tab.url in urlCount) {
        if (!tab.active && !tab.audible) {
          // Don't close active tabs or tabs playing audio
          tabsToClose.push(tab.id);
        }
        urlCount[tab.url]++;
      } else {
        urlCount[tab.url] = 1;
      }
    });

    // Close duplicate tabs
    if (tabsToClose.length > 0) {
      chrome.tabs.remove(tabsToClose, () => {
        console.log(`Closed ${tabsToClose.length} duplicate tabs`);
      });
    }
  });
}

// Run every 5 minutes
setInterval(closeDuplicateTabs, 5 * 1000);
