// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const tabs = await chrome.tabs.query({});
const collator = new Intl.Collator();
tabs.sort((a, b) => collator.compare(a.url, b.url));

console.log('tabs', tabs)

const template = document.getElementById("list_template");
const elements = new Set();
const tabUrls = new Array();

for (const tab of tabs) {
  const element = template.content.firstElementChild.cloneNode(true);

  const tabTitle = tab.title.split("-")[0].trim();
  const tabUrl = parseURL(tab.url);

  element.querySelector(".url").textContent = tabUrl;
  element.querySelector(".title").textContent = tabTitle;
  element.querySelector("a").addEventListener("click", async () => {
    // need to focus window as well as the active tab
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  });

  elements.add(element);
  tabUrls.push({
    tabId: tab.id,
    tabUrl: tabUrl,
  });
}
document.querySelector("ul").append(...elements);

const unique = [...new Map(
  tabUrls.map((m) => [m.tabUrl, m])).values()
];

const tabToCloses = tabUrls.filter(
  (item) => !unique.includes(item)
);

const button = document.querySelector("button");
const clearDuplicateButton = document.querySelector("button2");
button.addEventListener("click", async () => {
  for (const tabToClose of tabToCloses) {
    chrome.tabs.remove(tabToClose.tabId, function () {
      console.log("Closed multiple tabs");
    });
  }
});


function parseURL(url) {
  var regex = /^https:\/\/([^\/]+)\/(.*)$/;
  var match = url.match(regex);
  
  if (match) {
      var domain = match[1];
      return domain;
  } else {
      return null; // URL format doesn't match
  }
}
