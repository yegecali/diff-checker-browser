# HTML Diff Checker

A powerful browser extension that allows you to select and compare two HTML elements on any webpage, displaying their differences in a side-by-side view.

## Features

- 🎯 **Visual Element Selection** - Click to select elements directly on the page
- 🔍 **CSS Selector Support** - Manually enter selectors for precise targeting
- 📊 **Side-by-Side Diff View** - Clear visualization of differences
- 🎨 **Syntax Highlighting** - Regex-based highlighting for patterns
- 💾 **Persistent Selectors** - Automatically saves selectors per domain
- 📋 **Copy to Clipboard** - Export diff in unified format
- ⌨️ **Keyboard Shortcuts** - ESC to cancel selection

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yegecali/diff-checker-browser.git
   cd diff-checker-browser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in your browser:

   **Chrome/Edge:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `public` directory

   **Firefox:**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file in the `public` directory

## Usage

### Quick Start

1. Click the extension icon in your browser toolbar
2. Click "Seleccionar" for Element 1, then click any element on the page
3. Click "Seleccionar" for Element 2, then click another element
4. View the diff in the side panel that automatically opens

### Manual Selector Entry

Instead of clicking elements, you can enter CSS selectors manually:

1. Enter a selector (e.g., `#header`, `.main-content`, `div.article`) 
2. Click "Usar" to apply
3. Repeat for the second element

### Highlighting Patterns

Add regex patterns to highlight specific text in the diff:

1. Enter a regex pattern (e.g., `error|warn`, `\d{4}-\d{2}-\d{2}`)
2. Press Enter or click "+"
3. Patterns are color-coded and persist across sessions

### Keyboard Shortcuts

- **ESC** - Cancel element selection mode
- **Enter** - Submit selector input

## Development

### Prerequisites

- Node.js 16+ 
- npm 8+

### Scripts

```bash
# Build for production
npm run build

# Build and watch for changes (development)
npm run dev
```

### Project Structure

```
diff-checker-browser/
├── src/
│   ├── content.js       # Content script (element selection)
│   ├── popup.js         # Extension popup UI
│   ├── sidepanel.js     # Side panel diff viewer
│   └── background.js    # Background service worker
├── public/
│   ├── manifest.json    # Extension manifest
│   ├── popup/           # Popup HTML/CSS
│   └── sidepanel/       # Side panel HTML/CSS
└── icons/               # Extension icons
```

### Tech Stack

- **Diff Engine**: [diff](https://github.com/kpdecker/jsdiff) - Text diffing library
- **Build Tool**: [Vite](https://vitejs.dev/) - Fast build tool
- **Browser APIs**: Chrome Extension Manifest V3

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Uses the [jsdiff](https://github.com/kpdecker/jsdiff) library for text comparison
- Built with Chrome Extension Manifest V3

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yegecali/diff-checker-browser/issues) on GitHub.
