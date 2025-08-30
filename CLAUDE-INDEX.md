# TCN-Spaeti Project Navigation Index

## Project Overview
Browser automation suite for synchronizing ERP data with Ourvend vending machine platform using Playwright.

## Directory Structure

### 📁 /modules/ - Production Code
Organized, tested, and production-ready modules.

- **[/modules/common/](modules/common/)** - Shared utilities and authentication
  - `login.js` - Automated login functionality with encrypted credentials
  - `CLAUDE.md` - Common module documentation and rules

- **[/modules/commodity-management/](modules/commodity-management/)** - Product/commodity operations
  - `add-commodity-complete.js` - Full workflow for adding new products
  - `add-commodity-final-complete.js` - Refined version with all edge cases handled
  - `save-commodity.js` - Save operations for commodities
  - `save-with-image.js` - Handle image upload requirements
  - `CLAUDE.md` - Commodity management documentation

- **[/modules/slot-management/](modules/slot-management/)** - Vending machine slot configuration
  - `edit-slot-complete.js` - Complete slot editing workflow
  - `modify-all-slots.js` - Bulk operations on all slots
  - `query-slot-management.js` - Query and navigate slot management
  - `bootstrap-select-handler.js` - Handle special dropdown interactions
  - `CLAUDE.md` - Slot management documentation

### 📁 /excel-upload/ - Excel Import/Export
Utilities for generating Excel files from SQL Server data for Ourvend import.

- `generate-product-import.js` - Generate .xlsx format exports
- `generate-product-import-xls.js` - Generate .xls format exports
- Various template files for batch imports
- `CLAUDE.md` - Excel functionality documentation

### 📁 /archive/ - Historical Reference
Old experimental scripts preserved for reference.

- `/experimental-scripts/` - Early iterations and debugging scripts

### 📄 Root Files

- **[CLAUDE.md](CLAUDE.md)** - Main project documentation and AI assistant rules
- **[README.md](README.md)** - Project readme
- **[package.json](package.json)** - Node.js dependencies and scripts
- **[dummy4.jpg](dummy4.jpg)** - Required dummy image for product uploads

## Quick Navigation Tips

1. **Starting fresh?** Read [CLAUDE.md](CLAUDE.md) first
2. **Working on commodities?** Go to [/modules/commodity-management/](modules/commodity-management/)
3. **Working on slots?** Go to [/modules/slot-management/](modules/slot-management/)
4. **Need Excel export?** Check [/excel-upload/](excel-upload/)
5. **Looking for old code?** Browse [/archive/experimental-scripts/](archive/experimental-scripts/)

## Key Discoveries & Gotchas

- **Iframes everywhere** - Most pages load in iframes (e.g., commodity info in iframe id="54")
- **Multiple submit buttons** - Operations often require 2-3 different submit clicks
- **Bootstrap Select** - Special handling needed for dropdowns
- **Slow loading** - Everything needs strategic waits (5-7 seconds)
- **Images required** - All products need images, even dummy ones