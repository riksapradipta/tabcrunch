# TabCrunch

A Chrome extension to manage and clean up your tabs efficiently.

## Features

- **Clear Duplicated Tabs** - Remove duplicate tabs with one click (skips active tabs and tabs playing media)
- **Auto-close Duplicates** - Automatically close duplicate tabs at a custom interval (1-60 minutes)
- **Sort Tabs** - Organize your tabs by grouping them based on their favicon
- **Smart Tab Grouping** - New tabs are automatically placed next to tabs from the same website

## Installation (Developer Mode)

Since this extension is not on the Chrome Web Store, you can install it manually:

### Option 1: Clone the Repository

1. Open your terminal and run:
   ```bash
   git clone https://github.com/riksapradipta/tabcrunch.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** by toggling the switch in the top-right corner

4. Click **Load unpacked**

5. Select the `tabcrunch` folder you just cloned

6. The extension is now installed! You should see the TabCrunch icon in your toolbar

### Option 2: Download ZIP

1. Go to the [repository page](https://github.com/riksapradipta/tabcrunch)

2. Click the green **Code** button, then click **Download ZIP**

3. Extract the ZIP file to a folder on your computer

4. Open Chrome and navigate to `chrome://extensions/`

5. Enable **Developer mode** by toggling the switch in the top-right corner

6. Click **Load unpacked**

7. Select the extracted `tabcrunch-main` folder

8. The extension is now installed!

## Usage

Click on the TabCrunch icon in your Chrome toolbar to open the popup:

- **Auto-left Toggle** - Enable to automatically group new tabs with tabs from the same website
- **Clear Button** - Manually remove all duplicate tabs
- **Sort Button** - Sort all tabs by their favicon
- **Auto-close Toggle** - Enable automatic duplicate removal at your specified interval

## Updating the Extension

If you installed via git clone:
```bash
cd tabcrunch
git pull
```
Then go to `chrome://extensions/` and click the refresh icon on the TabCrunch card.

If you installed via ZIP, download the new ZIP and repeat the installation steps.
