# Contributing to HTML Diff Checker

Thank you for considering contributing to HTML Diff Checker! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Browser and version** you're using
- **Extension version**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why this enhancement would be useful
- **Possible implementation** if you have ideas

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style guidelines
3. **Test your changes** - ensure the extension builds and works
4. **Update documentation** if needed
5. **Commit your changes** with clear, descriptive messages
6. **Push to your fork** and submit a pull request

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/diff-checker-browser.git
   cd diff-checker-browser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

4. Load the extension in your browser (see README.md)

## Code Style Guidelines

This project uses ESLint and Prettier for code formatting:

- **Run linter**: `npm run lint`
- **Auto-fix issues**: `npm run lint:fix`
- **Format code**: `npm run format`
- **Check formatting**: `npm run format:check`

### JavaScript Style

- Use ES6+ features
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`
- Use arrow functions for callbacks
- Prefix unused parameters with underscore: `_sender`
- Use meaningful variable names

### Code Organization

- Keep functions small and focused
- Add comments for complex logic
- Group related functionality together
- Use consistent naming conventions

## Commit Messages

Write clear, concise commit messages:

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs when applicable

Examples:
```
Add regex pattern export functionality
Fix element selection on dynamic pages
Update README with installation steps
```

## Testing

Before submitting a PR:

1. **Build the extension**: `npm run build`
2. **Load and test** in Chrome/Edge and Firefox if possible
3. **Test core functionality**:
   - Element selection (both click and selector input)
   - Diff generation
   - Regex highlighting
   - Selector persistence
   - Copy to clipboard

## Project Structure

```
src/
├── content.js       # Content script - element selection & page interaction
├── popup.js         # Popup UI - main control panel
├── sidepanel.js     # Side panel - diff visualization
└── background.js    # Background worker - minimal coordination

public/
├── manifest.json    # Extension manifest (MV3)
├── popup/          # Popup HTML/CSS
├── sidepanel/      # Side panel HTML/CSS
└── icons/          # Extension icons
```

## Questions?

Feel free to open an issue for questions or discussion. We're happy to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
