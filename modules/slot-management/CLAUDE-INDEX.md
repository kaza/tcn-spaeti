# Slot Management Module - Navigation Index

## Overview
Manages vending machine slot configurations - assigning products to specific positions in vending machines. Uses Bootstrap Select dropdowns and iframe-based interface.

## 🚀 Production Ready Implementation
The complete slot update system is now available at the root level:
- **[/update-slot-from-config.js](/update-slot-from-config.js)** - Automated slot updates from JSON
- **[/slot-configurations.json](/slot-configurations.json)** - Configuration file
- **[/SLOT-UPDATE-README.md](/SLOT-UPDATE-README.md)** - Complete documentation

### Key Features:
- ✅ Batch processing multiple slots
- ✅ Product assignment with Bootstrap Select
- ✅ Price updates (#SiPrice, #SiCustomPrice)
- ✅ Error handling for missing slots
- ✅ Success confirmation handling

## Files in this Directory

### 🧭 Navigation & Core Functions
- **[navigate-slot-management.js](navigate-slot-management.js)** - Basic navigation to slot management page
  - Handles menu expansion and click
  - Waits for iframe load
  - Foundation for other scripts

- **[query-slot-management.js](query-slot-management.js)** - Query machines and load slot grid
  - Handles group selection (Default Unit2)
  - Handles machine selection (Slatko 2503050187)
  - Triggers query to load slot data

- **[bootstrap-select-handler.js](bootstrap-select-handler.js)** - Reliable Bootstrap Select handling
  - Method 3 confirmed working!
  - Handles difficult dropdown interactions
  - Essential for machine selection

### ✏️ Slot Editing Operations
- **[edit-slot.js](edit-slot.js)** - Basic slot editing functionality
  - Opens edit modal for specific slots
  - Exploratory implementation
  - Good for understanding modal structure

- **[edit-slot-product.js](edit-slot-product.js)** - Product assignment to slots
  - Attempts to assign products to slots
  - Work in progress - field mapping incomplete

- **[edit-slot-complete.js](edit-slot-complete.js)** - Complete slot editing workflow
  - Full workflow from navigation to edit
  - Includes machine selection
  - Handles success confirmations

- **[modify-all-slots.js](modify-all-slots.js)** - Bulk slot modification
  - Edits all slots in sequence
  - Handles success modal dismissal
  - Good for batch operations

### 🔍 Analysis & Alternative Methods
- **[analyze-slot-form.js](analyze-slot-form.js)** - Deep form structure analysis
  - Explores edit modal fields
  - Helps identify form elements
  - Useful for debugging field issues

- **[query-by-boxid.js](query-by-boxid.js)** - Alternative query method
  - Attempts direct BoxID query
  - Currently not working as expected
  - Kept for reference

### 📚 Documentation
- **[CLAUDE.md](CLAUDE.md)** - Comprehensive module documentation
  - Bootstrap Select handling methods
  - Modal behavior and stacking issues
  - Confirmed working workflows
  - Field mapping discoveries

## Key Discoveries

### 🎯 Bootstrap Select Challenge
The biggest challenge is handling Bootstrap Select dropdowns:
```javascript
// Working method (Method 3)
const button = document.querySelector('button.dropdown-toggle');
button.click();
await waitForTimeout(1000);
const items = document.querySelectorAll('.dropdown-menu.open li a');
// Find and click the desired option
```

### 🖼️ Iframe Pattern
- Slot management loads in iframe id="43"
- URL: /Selection/Index
- Must switch to iframe context

### 📋 Workflow Requirements
1. Must select group first (populates machines)
2. Must select machine second
3. Query button loads slot grid
4. Each slot has Edit/Clear buttons

### ✅ Success Modal Pattern
- After saving, "Edited successfully" modal appears
- Must click Close button to dismiss
- Modal stacking can occur if not handled

## Usage Example

```javascript
// Complete slot editing workflow
const { chromium } = require('playwright');
const { login } = require('../common/login');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await login(page);
// Navigate and edit slots using edit-slot-complete.js
```

## Common Tasks

- **Edit single slot** → Use `edit-slot-complete.js`
- **Bulk edit slots** → Use `modify-all-slots.js`
- **Debug dropdowns** → Check `bootstrap-select-handler.js`
- **Analyze form fields** → Run `analyze-slot-form.js`