# Common Module - AI Assistant Documentation

## Purpose
This module contains shared functionality used across all Ourvend automation scripts.

## Key Functions

### login(page)
Handles authentication to the Ourvend platform.

**Important Details:**
- URL: https://os.ourvend.com/Account/Login
- Credentials are hardcoded (should be moved to environment variables)
- Uses JavaScript click to handle the sign-in button
- Waits 5 seconds after login for dashboard to load

## Usage Example
```javascript
const { chromium } = require('playwright');
const { login } = require('./login');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await login(page);
// Now you're logged in and can navigate
```

## Common Issues
1. **Login timeout**: The site sometimes loads slowly. Current timeout is 120 seconds.
2. **Button detection**: The login button text can be "Sign In", "Login", or Chinese characters.

## Future Improvements
- Move credentials to environment variables
- Add retry logic for failed logins
- Check for successful login before proceeding