# Vault Palette

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Patreon](https://img.shields.io/badge/Patreon-dejandj79-f96854?logo=patreon&logoColor=white)](https://patreon.com/dejandj79)
[![thanks.dev](https://img.shields.io/badge/thanks.dev-dejandj79-blue)](https://thanks.dev/dejandj79)

Vault Palette is inspired by Mithadon's original plugin, [Mithadon/obsidian-color-folders-files](https://github.com/Mithadon/obsidian-color-folders-files/releases). This project expands that idea into a broader vault styling tool for folders, files, and tags.

Customize the appearance of folders, files, and tags in Obsidian through a context menu and plugin settings panel.

## Features

- Right-click any file or folder to customize its appearance.
- Use optional background colors, border colors, text colors, bold, italic, and opacity.
- Keep folder text styling separate from the styling applied to files inside that folder.
- Apply folder styles to subfolders.
- Apply a separate file text style to all files inside a folder.
- Use stable rainbow colors for file names inside a styled folder.
- Save and apply presets.
- Detect vault tags automatically.
- Set one shared tag text color and per-tag background colors.
- Import and export plugin settings.

## Usage

1. Right-click any file or folder in the file explorer.
2. Select **Customize appearance**.
3. Adjust the folder or file appearance.
4. For folders, optionally enable **Apply custom file text style** and configure the file text color, bold, and italic settings.
5. Click **Apply**.

## Presets

Presets save the full style package:

- Main item style: background, border, text color, bold, italic, and opacity.
- Folder behavior: apply to subfolders.
- File behavior: optional custom style for files inside the folder.
- Rainbow file names.

When a preset is applied to a folder, the main item style affects the folder and the file behavior affects files inside that folder. When the same preset is applied directly to a file, only the main item style is used.

## Tags

Open the plugin settings and switch to the **Tags** tab. Vault Palette detects tags from Obsidian's metadata cache and lets you set:

- One shared text color for all tags.
- A separate background color for each detected tag.

## Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Create this folder inside your vault: `.obsidian/plugins/vault-palette/`.
3. Copy the three downloaded files into that folder.
4. Restart Obsidian or reload plugins.
5. Enable **Vault Palette** in **Settings > Community plugins**.

## Development

Install dependencies:

```bash
npm install
```

Build the plugin:

```bash
npm run build
```

For local testing, copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<your-vault>/.obsidian/plugins/vault-palette/
```

## Support

If Vault Palette helps your Obsidian workflow, you can support development here:

- [Patreon](https://patreon.com/dejandj79)
- [thanks.dev](https://thanks.dev/dejandj79)

## Credits

Vault Palette is inspired by [Mithadon's Color Folders and Files plugin](https://github.com/Mithadon/obsidian-color-folders-files/releases). The original project is licensed under the MIT license.
