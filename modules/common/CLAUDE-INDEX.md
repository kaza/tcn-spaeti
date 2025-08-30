# Common Module - Navigation Index

## Overview
Shared utilities and authentication functionality used across all modules.

## Files in this Directory

### 🔐 Authentication
- **[login.js](login.js)** - Core login functionality with encrypted credential handling
  - Handles Ourvend's JavaScript-based encryption
  - Provides reusable login function for all modules
  - Manages session persistence after successful login

### 📚 Documentation
- **[CLAUDE.md](CLAUDE.md)** - Common module specific rules and guidelines
  - Authentication best practices
  - Credential management
  - Session handling instructions

## Usage Examples

```javascript
const { login } = require('../common/login');

// In your module:
const page = await browser.newPage();
await login(page);
// Page is now authenticated and ready for operations
```

## Key Functions

- `login(page)` - Authenticates a Playwright page instance
  - Returns: Authenticated page object
  - Throws: On login failure

## Dependencies
- Playwright for browser automation
- No external authentication libraries (uses platform's native JS)