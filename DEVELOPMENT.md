# Developer Documentation

This document provides detailed information for developers working on the HTML Diff Checker extension.

## Architecture Overview

### Components

The extension consists of four main components:

1. **Content Script** (`src/content.js`)
   - Runs on all web pages
   - Handles element selection UI
   - Manages element highlighting and capture
   - Generates text diffs using the `diff` library

2. **Popup** (`src/popup.js`)
   - Main control panel UI
   - Manages element selection controls
   - Handles regex pattern management
   - Persists selectors to storage

3. **Side Panel** (`src/sidepanel.js`)
   - Displays diff results
   - Renders side-by-side comparison
   - Applies regex highlighting
   - Provides copy-to-clipboard functionality

4. **Background Service Worker** (`src/background.js`)
   - Minimal coordinator
   - Auto-opens side panel on diff completion
   - Handles keyboard shortcuts

### State Management

The extension uses a combination of:
- **In-memory state** in content script for current selection
- **Chrome Storage API** for persistent data:
  - Saved selectors (per-domain)
  - Regex patterns (global)
- **Message passing** for component communication

### Message Flow

```
User Action → Popup/Keyboard
    ↓
    Message to Content Script
    ↓
    Element Selection/Capture
    ↓
    Diff Generation
    ↓
    STATE_UPDATE message
    ↓
    Background Worker + Side Panel
```

## Code Structure

### Content Script State Machine

The content script operates in one of four states:

- `IDLE` - No elements selected
- `SELECTING_1` - User is selecting first element
- `SELECTING_2` - User is selecting second element  
- `SHOWING_DIFF` - Diff has been generated

### Selector Generation

Selectors are generated using a fallback approach:
1. Element ID (if present) → `#element-id`
2. Full path from body → `body > div:nth-of-type(2) > p:nth-of-type(1)`

This ensures selectors are:
- Unique and specific
- Reasonably stable across page loads
- Human-readable when possible

### Diff Algorithm

Uses the `diff` library with two-level diffing:
1. **Line-level diff** - Identifies added/removed/changed lines
2. **Word-level diff** - For changed lines, highlights specific words

This provides precise visualization of changes.

## Build System

### Vite Configuration

The project uses **two separate Vite builds**:

1. **Main Build** (`vite.config.js`)
   - Builds: `popup.js`, `sidepanel.js`, `background.js`
   - Output: `public/` directory

2. **Content Script Build** (`vite.content.config.js`)
   - Builds: `content.js` only
   - Output: `public/` directory
   - Uses different bundle settings (no code splitting)

### Why Two Builds?

Content scripts have restrictions:
- Cannot use dynamic imports
- Must be a single file
- Different CSP requirements

## Development Workflow

### Initial Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This runs both Vite builds in watch mode. Any changes to source files trigger automatic rebuilds.

### Load Extension

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the `public/` directory

The extension will reload automatically when files in `public/` change.

### Testing Changes

1. Make code changes
2. Wait for build to complete (watch mode)
3. Click reload button in `chrome://extensions/`
4. Test on a web page

For content script changes, you may need to refresh the web page as well.

## Code Quality

### Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### Formatting

```bash
npm run format        # Format all code
npm run format:check  # Check formatting
```

### Pre-commit Hooks

Husky + lint-staged runs automatically on commit:
- Lints changed files
- Formats changed files
- Prevents committing broken code

## Storage Schema

### Saved Selectors

```json
{
  "hdc_saved_selectors": {
    "https://example.com/page": {
      "sel1": "#header",
      "sel2": ".main-content"
    }
  }
}
```

Key format: `origin + pathname` (e.g., `https://example.com/about`)

### Regex Patterns

```json
{
  "hdc_regex_list": [
    "error|warn",
    "\\d{4}-\\d{2}-\\d{2}",
    "TODO|FIXME"
  ]
}
```

Array of regex pattern strings, applied in order with cycling colors.

## Message Protocol

### Messages to Content Script

```javascript
// Start element selection
{ type: 'START_PICK', slot: 1 | 2 }

// Submit CSS selector
{ type: 'SELECTOR_SUBMIT', slot: 1 | 2, value: string }

// Get current state
{ type: 'GET_STATE' }

// Reset everything
{ type: 'RESET' }
```

### Messages from Content Script

```javascript
// State update (broadcast)
{
  type: 'STATE_UPDATE',
  state: {
    phase: 'IDLE' | 'SELECTING_1' | 'SELECTING_2' | 'SHOWING_DIFF',
    element1: { selector: string } | null,
    element2: { selector: string } | null,
    diff: Array<DiffChange> | null,
    error: string | null
  }
}
```

## Styling

### CSS Organization

Each component has its own CSS file:
- `public/popup/popup.css` - Popup UI
- `public/sidepanel/sidepanel.css` - Side panel
- `public/content.css` - Page overlays (banner, toast, highlights)

### CSS Naming Convention

All extension CSS uses the `hdc-` prefix to avoid conflicts:
- `hdc-pick-banner`
- `hdc-hover`
- `hdc-selected-1`

## Performance Considerations

### Content Script

- Injected on all pages (`<all_urls>`)
- Runs at `document_idle` to minimize impact
- Minimal overhead when not actively selecting
- Event listeners only added during selection mode

### Diff Generation

- Uses efficient line-based algorithm
- Text normalization removes unnecessary whitespace
- Word-level diff only for changed lines (not entire text)

### Storage

- Selectors stored by domain (automatic cleanup)
- Regex patterns limited by UI (no arbitrary growth)

## Security

### Content Security Policy

The extension follows CSP best practices:
- No inline scripts
- No `eval()` or similar dynamic code
- All scripts loaded from extension files

### Permissions

Minimal required permissions:
- `activeTab` - Access current tab only when popup opened
- `scripting` - Inject content script
- `sidePanel` - Display side panel
- `storage` - Persist user data
- `tabs` - Query active tab

No broad permissions like `<all_urls>` at manifest level.

### User Input

- CSS selectors validated via try/catch
- Regex patterns validated before storage
- HTML escaped in all UI rendering

## Debugging

### Console Logging

Content script, popup, and side panel have separate consoles:
- Content Script: Main page console (F12)
- Popup: Right-click extension icon → Inspect popup
- Side Panel: Right-click side panel → Inspect
- Background: chrome://extensions → Inspect service worker

### Common Issues

1. **Content script not responding**
   - Script may not be injected yet
   - Check protected pages (chrome://, about:, etc.)
   - Look for CSP violations in console

2. **State not updating**
   - Check message passing in both consoles
   - Verify sender.tab.id matches currentTabId
   - Ensure STATE_UPDATE is being broadcast

3. **Build not reflecting changes**
   - Check Vite watch is running
   - Reload extension in chrome://extensions
   - Refresh the test page

## Testing

Currently no automated tests. Manual testing checklist:

- [ ] Element selection via click (both slots)
- [ ] Element selection via CSS selector
- [ ] Invalid selector error handling
- [ ] Diff generation and display
- [ ] Regex pattern add/remove
- [ ] Regex highlighting in diff
- [ ] Copy to clipboard
- [ ] Selector persistence across reloads
- [ ] Keyboard shortcuts
- [ ] ESC to cancel selection
- [ ] Multiple tabs (side panel follows active tab)

## Future Improvements

Potential areas for enhancement:

1. **Testing**
   - Unit tests for diff algorithm
   - Integration tests for message flow
   - E2E tests with Puppeteer/Playwright

2. **Internationalization**
   - Extract strings to message catalog
   - Support multiple languages
   - Use chrome.i18n API

3. **Export Formats**
   - JSON export
   - CSV export
   - HTML report

4. **Performance**
   - Virtual scrolling for large diffs
   - Lazy highlighting for regex
   - Debounce selector input

5. **Features**
   - Compare HTML structure (not just text)
   - XPath support
   - Diff history
   - Custom color themes
