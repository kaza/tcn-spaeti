# Commodity Management Module - Navigation Index

## Overview
Handles all product/commodity operations in Ourvend including adding, saving, and managing products with required image uploads.

## Files in this Directory

### 🎯 Main Workflows
- **[add-commodity-complete.js](add-commodity-complete.js)** - Complete workflow for adding new commodities
  - Handles navigation through iframe structure
  - Manages modal interactions
  - Includes image upload handling
  - Production-ready implementation

- **[add-commodity-final-complete.js](add-commodity-final-complete.js)** - Refined and optimized commodity addition
  - Enhanced error handling
  - Improved wait strategies
  - Handles all edge cases discovered
  - Most reliable version for production use

- **[add-commodity.js](add-commodity.js)** - Core navigation and utility functions
  - `navigateToCommodityInfo()` - Navigate to commodity management page
  - Iframe handling utilities
  - Reusable across other scripts

### 💾 Save Operations
- **[save-commodity.js](save-commodity.js)** - Basic commodity save functionality
  - Form field population
  - Submit button handling
  - Validation logic

- **[save-with-image.js](save-with-image.js)** - Save commodity with image upload
  - Image file handling
  - Three-step submit process (crop, save, dismiss)
  - Handles image validation requirements

### 🧪 Testing & Debugging
- **[test-add-commodity.js](test-add-commodity.js)** - Test script for commodity addition
  - Runs full add commodity workflow
  - Good for testing changes
  - Includes debug logging

- **[debug-popups.js](debug-popups.js)** - Debug tool for popup analysis
  - Finds all modals and popups
  - Helps identify correct submit buttons
  - Useful for troubleshooting save issues

### 📚 Documentation
- **[CLAUDE.md](CLAUDE.md)** - Comprehensive module documentation
  - Critical discoveries (iframes, multiple submits)
  - Common issues and solutions
  - Weird quirks and lessons learned
  - Required fields and validation rules

## Key Discoveries

### 🖼️ Iframe Architecture
- Commodity page loads in iframe with id="54"
- Must switch to iframe context before any operations
- Main URL vs iframe URL are different

### 🔘 Three Submit Button Pattern
1. **Crop Submit** - Confirms image crop
2. **Save Submit** - Actually saves the commodity
3. **Dismiss Submit** - Closes success notification

### 📸 Image Requirements
- Every product MUST have an image
- Use dummy4.jpg for products without real images
- Max size: 15KB, formats: jpg/png

## Usage Example

```javascript
// Use the complete workflow
const { chromium } = require('playwright');
const { login } = require('../common/login');
const { navigateToCommodityInfo } = require('./add-commodity');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await login(page);
await navigateToCommodityInfo(page);
// Now ready to add commodities
```

## Common Tasks

- **Add new product** → Use `add-commodity-final-complete.js`
- **Debug save issues** → Run `debug-popups.js`
- **Test changes** → Use `test-add-commodity.js`
- **Understanding quirks** → Read CLAUDE.md "Weird Things We Learned" section