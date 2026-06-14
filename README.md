# TabCrunch

Tired of having too many tabs open? TabCrunch helps you clean up and organize your browser tabs.

## Features

- **Remove Duplicated Tabs** — Finds and closes tabs that are open more than once. Won't close the tab you're looking at or any tab playing music/video. Use the "Clear" button in the popup, or right-click any page and choose "Remove duplicated tabs."
- **Auto-close Duplicates** — Turn this on and TabCrunch will automatically clean up duplicate tabs every few minutes. You can set how often it runs (anywhere from 1 to 60 minutes).
- **Prevent Duplicates** — When this is on, if you try to open a page that's already open in another tab, TabCrunch will switch you to the existing tab instead of opening a new one.
- **Smart Tab Grouping (Auto-left)** — New tabs automatically appear right next to other tabs from the same website. No more hunting for related tabs across your tab bar.
- **Sort Tabs by Icon** — Rearranges all your tabs in order by website icon. Groups same-site tabs together with one click.
- **Live Tab Count** — The popup shows you exactly how many tabs you have open and how many are duplicates.
- **Duplicate Badge** — A red dot appears on the TabCrunch icon whenever duplicate tabs are detected.
- **Light/Dark Mode** — Choose light, dark, or let it follow your computer's setting. Your choice is saved even after closing Chrome.

## Privacy

TabCrunch works entirely on your device. It does not collect, store, or send your data anywhere — no tracking, no analytics, no selling your information. Everything stays in your browser.

This project is open source, so anyone can verify exactly what it does. You can even ask an AI to check the code if you want! :D

## Installation (Developer Mode)

This extension isn't on the Chrome Web Store yet, so you'll need to install it manually:

### Option 1: Clone the Repository

1. Open your terminal and run:
   ```bash
   git clone https://github.com/riksapradipta/tabcrunch.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Turn on **Developer mode** (toggle in the top-right corner)

4. Click **Load unpacked**

5. Select the `tabcrunch` folder you just downloaded

6. You're all set! You'll see the TabCrunch icon in your toolbar

### Option 2: Download ZIP

1. Go to the [repository page](https://github.com/riksapradipta/tabcrunch)

2. Click the green **Code** button, then **Download ZIP**

3. Unzip the file somewhere on your computer

4. Open Chrome and go to `chrome://extensions/`

5. Turn on **Developer mode** (toggle in the top-right corner)

6. Click **Load unpacked**

7. Select the `tabcrunch-main` folder you just unzipped

8. Done! The TabCrunch icon will appear in your toolbar

## Usage

Click the TabCrunch icon in your Chrome toolbar to open the popup:

- **Auto-left** — Turn this on to keep tabs from the same website grouped together
- **Clear** — Click to close all duplicate tabs right away
- **Sort** — Click to rearrange your tabs by website icon
- **Prevent Duplicates** — Turn this on to automatically switch to open tabs instead of making new duplicates
- **Auto-close** — Turn this on to have TabCrunch automatically clean up duplicates on a schedule

## Updating

If you installed with git clone:
```bash
cd tabcrunch
git pull
```
Then go to `chrome://extensions/` and click the refresh icon on the TabCrunch card.

If you installed from a ZIP, download the new ZIP and repeat the installation steps.
