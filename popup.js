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
document.getElementsByTagName("head")[0].innerHTML +=
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src gap://ready file://* *; style-src 'self' http://* https://* 'unsafe-inline'; script-src 'self' http://* https://* 'unsafe-inline' 'unsafe-eval'\">";
let tabs = await chrome.tabs.query({});
const collator = new Intl.Collator();
tabs.sort((a, b) => collator.compare(a.favIconUrl, b.favIconUrl));

// const template = document.getElementById("list_template");
const niceElement = document.getElementById("title");
const niceDesc = document.getElementById("description");
const elements = new Set();
const tabUrls = new Array();
const tabIcons = new Array();

niceElement.textContent = `${tabs.length}`;
niceDesc.textContent = `with ${tabs.length} tabs opened`;

for (const tab of tabs) {
  // const element = template.content.firstElementChild.cloneNode(true);
  // const tabTitle = tab.title.split("-")[0].trim();
  const tabUrl = parseURL(tab.url);

  // element.querySelector(".titleList").textContent = tabTitle;

  // elements.add(element);
  tabUrls.push({
    tabId: tab.id,
    tabUrl: tabUrl,
  });

  tabIcons.push({
    tabIcon: tab.favIconUrl,
    tabId: tab.id,
    tabIndex: tab.index,
    tabLast: tab.lastAccessed,
  });
}

// document.querySelector("ul").append(...elements);

function getTabs() {
  return browser.tabs.query(queryInfo);
}

function sortByIcons() {
  // Move tabs to new positions
  tabIcons.sort().forEach((icon, index) => {
    chrome.tabs.move(icon.tabId, { index: index }, function () {});
  });
}

const uniqueTabs = [...new Map(tabUrls.map((m) => [m.tabUrl, m])).values()];

niceElement.textContent = `${
  tabUrls.filter((item) => !uniqueTabs.includes(item)).length
} duplicated tabs`;

document.querySelector(".duplicate").addEventListener("click", async () => {
  closeDuplicatedTabExceptOne();
});

document.getElementById("sortButton").addEventListener("click", async () => {
  sortByIcons();
});

async function fetchTabs() {
  tabs = await chrome.tabs.query({});
}

async function myFunction() {
  return browser.tabs.query();
}

myFunction().then(
  function (value) {
    console.log("try", value);
    myDisplayer(value);
  },
  function (error) {
    myDisplayer(error);
  }
);

function myDisplayer(value) {
  console.log(value);
}

function closeDuplicatedTabExceptOne() {
  const closeTabs = tabUrls.filter((item) => !uniqueTabs.includes(item));

  for (const closeTab of closeTabs) {
    chrome.tabs.remove(closeTab.tabId, function () {});
  }

  fetchTabs();
  myFunction();
  getTabs();
  console.log("tabs", getTabs());
  console.log(myFunction);

  niceElement.textContent = `${tabs.length} tabs opened`;
}

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
