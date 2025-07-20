# TCN Spaeti - Ourvend Automation

Automated login script for Ourvend OS platform using Playwright.

## Prerequisites

- Node.js installed
- npm installed

## Installation

```bash
npm install
```

## Usage

Run the login automation:

```bash
node ourvend-login-simple.js
```

The script will:
1. Open a browser window
2. Navigate to the Ourvend login page
3. Fill in the credentials
4. Click the Sign In button
5. Navigate to the dashboard

## Scripts

- `ourvend-login-simple.js` - Simple login automation script
- `ourvend-login.js` - Basic login script with more options
- `ourvend-login-advanced.js` - Advanced script with extensive error handling

## Screenshots

The scripts save screenshots:
- `login-page.png` - Screenshot of the login page with filled credentials
- `after-click.png` - Screenshot after login attempt