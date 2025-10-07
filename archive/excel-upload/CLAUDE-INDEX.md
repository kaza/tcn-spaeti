# Excel Upload Module - Navigation Index

## Overview
Generates Excel files from Azure SQL Server product data for bulk import into Ourvend. Supports both modern XLSX and legacy XLS formats with exact header requirements.

## Files in this Directory

### 🚀 Excel Generation Scripts
- **[generate-product-import.js](generate-product-import.js)** - Modern XLSX generator
  - Uses ExcelJS library with template support
  - Generates ~40KB files with proper formatting
  - Outputs: `product-import-YYYYMMDD.xlsx`
  - Handles 49-character product name limit

- **[generate-product-import-xls.js](generate-product-import-xls.js)** - Legacy XLS generator
  - Uses xlsx library for BIFF8 format
  - Excel 97-2003 compatible (~148KB files)
  - Outputs: `product-import-YYYYMMDD.xls`
  - Alternative for compatibility issues

### 📄 Template Files
- **[Template-BatchImportTemplates.xls](Template-BatchImportTemplates.xls)** - Official Ourvend template
  - Contains required headers with asterisks
  - Do NOT modify header names
  - Base template for all exports

- **[BatchImportTemplates.xls](BatchImportTemplates.xls)** - Working template copy
- **[Batch-import-of-templates.xlsx](Batch-import-of-templates.xlsx)** - XLSX format template
- Various other template variations for testing

### 📊 Generated Export Files
- **[product-import-20250720.xlsx](product-import-20250720.xlsx)** - Sample XLSX export
- **[product-import-20250720.xls](product-import-20250720.xls)** - Sample XLS export
- **[product-import-20250721_1419.xls](product-import-20250721_1419.xls)** - Timestamped export

### 📚 Documentation
- **[CLAUDE.md](CLAUDE.md)** - Comprehensive module documentation
  - Critical header requirements
  - Database mapping details
  - Common issues and solutions
  - Security considerations

- **[README.md](README.md)** - Basic module readme

## Critical Information

### ⚠️ Header Requirements
Headers MUST be exactly:
```
Product barcode* | Product name* | Unit price* | Cost price | Supplier* | Specs | Type* | Promotion price | Member Price | Discount | Tax rate
```
**The asterisks are part of the header names!**

### 🗄️ Database Mapping
- `id` → Product barcode*
- `name` → Product name* (max 49 chars)
- `sales_price` → Unit price*
- `purchase_price` → Cost price
- `'default'` → Supplier* & Type*

### 🔧 Key Technical Points
- ExcelJS: Use array-based row addition with templates
- File validation: Check size (>30KB for XLSX, >100KB for XLS)
- Azure SQL: Requires encrypted connections
- WSL: Use forward slashes for paths

## Usage Examples

```bash
# Generate modern Excel file
cd excel-upload
node generate-product-import.js

# Generate legacy Excel file
node generate-product-import-xls.js

# Check output
ls -lh product-import-*.xls*
```

## Common Tasks

- **Generate product export** → Run `generate-product-import.js`
- **Need legacy format** → Use `generate-product-import-xls.js`
- **Modify headers** → DON'T! Headers must match exactly
- **Debug empty files** → Check array-based row addition

## Environment Setup

Requires `.env` file with:
```
DB_USER=your_user
DB_PASSWORD=your_password
DB_SERVER=your_server.database.windows.net
DB_DATABASE=SpaetiToGo
```