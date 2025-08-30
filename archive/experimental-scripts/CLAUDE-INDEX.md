# Archive - Experimental Scripts Index

## Overview
Historical collection of experimental scripts created during the discovery and development phase. These show the evolution of understanding Ourvend's complex interface.

## ⚠️ WARNING
These scripts are NOT for production use. They are preserved for reference only. Use `/modules/` for production-ready code.

## Files in this Directory

### 🔐 Login Experiments
- **[ourvend-login.js](ourvend-login.js)** - First login attempt
  - Basic login implementation
  - Early credential handling

- **[ourvend-login-simple.js](ourvend-login-simple.js)** - Simplified login approach
  - Reduced complexity version
  - Different wait strategy

- **[ourvend-login-advanced.js](ourvend-login-advanced.js)** - Enhanced login with better error handling
  - More robust implementation
  - Additional validation

### 📦 Commodity Management Iterations
- **[add-commodity.js](add-commodity.js)** - Initial commodity addition attempt
  - First approach to adding products
  - Discovered iframe issues here

- **[add-commodity-slow.js](add-commodity-slow.js)** - Added longer waits
  - Attempted to fix timing issues
  - Discovered multiple submit buttons

- **[add-commodity-step-by-step.js](add-commodity-step-by-step.js)** - Broken down into steps
  - Debugging approach
  - Helped identify the three-submit pattern

- **[add-commodity-interactive.js](add-commodity-interactive.js)** - Interactive version
  - Manual intervention points
  - For understanding flow

- **[add-commodity-working.js](add-commodity-working.js)** - First working version
  - Breakthrough with iframe handling
  - Foundation for production code

- **[add-commodity-final.js](add-commodity-final.js)** - Refined working version
  - Cleaned up implementation
  - Moved to modules after this

### 🔍 Debug and Discovery Tools
- **[check-iframes.js](check-iframes.js)** - Iframe discovery tool
  - Critical script that found iframe id="54"
  - Breakthrough moment in development

- **[debug-find-all-links.js](debug-find-all-links.js)** - Link finder
  - Helped map navigation structure
  - Found SetMenuLinkUrl pattern

- **[debug-commodity-menu.js](debug-commodity-menu.js)** - Menu interaction debugger
  - Explored menu expansion issues
  - Helped understand navigation

- **[find-add-button.js](find-add-button.js)** - Add button locator
  - Multiple approaches to find the button
  - Led to iframe discovery

- **[click-add-link.js](click-add-link.js)** - Direct add button click attempts
- **[click-add-modal.js](click-add-modal.js)** - Modal interaction experiments
- **[force-click-add.js](force-click-add.js)** - Force click approaches
- **[retry-add-button.js](retry-add-button.js)** - Retry logic experiments

### 🛠️ Other Experiments
- **[manual-add-commodity.js](manual-add-commodity.js)** - Manual intervention approach
  - Semi-automated with manual steps
  - Helped understand requirements

- **[simple-add.js](simple-add.js)** - Minimal implementation attempt
  - Stripped down version
  - Testing core functionality

## Evolution Timeline

1. **Login Phase** - Started with basic login, evolved to handle encryption
2. **Navigation Discovery** - Found menu structure and SetMenuLinkUrl
3. **Iframe Breakthrough** - `check-iframes.js` discovered iframe architecture
4. **Button Pattern** - Discovered three-submit button requirement
5. **Working Implementation** - `add-commodity-working.js` succeeded
6. **Production Ready** - Moved refined code to `/modules/`

## Key Discoveries Made Here

- **Iframe id="54"** for commodity management
- **Three submit buttons** for save operation
- **Bootstrap Select** special handling needed
- **Slow page loads** require strategic waits
- **Modal stacking** can occur

## Don't Use These For
- Production implementations
- New feature development
- Customer deployments

## Do Use These For
- Understanding evolution of solution
- Debugging similar issues
- Historical reference
- Learning what didn't work