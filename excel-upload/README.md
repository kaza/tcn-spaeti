# Excel Export Module Documentation

## Overview
This module provides functionality to export product data from Azure SQL Server to Excel files in both modern (.xlsx) and legacy (.xls) formats, specifically formatted for the Ourvend batch import system.

## Prerequisites
- Node.js installed
- NPM packages: `mssql`, `exceljs`, `xlsx`, `dotenv`
- Azure SQL Server access with valid credentials
- Excel template file (optional for .xlsx format)

## Configuration
Database credentials are stored in the `.env` file in the project root:
```
SQL_SERVER=almir.database.windows.net
SQL_DATABASE=SpaetiToGo
SQL_USER=almir
SQL_PASSWORD=Zebra1234!
SQL_PORT=1433
```

## Scripts

### 1. `generate-product-import.js` (XLSX Format)
Generates Excel files in modern .xlsx format with template support.

**Features:**
- Uses ExcelJS library
- Can read and preserve existing template structure
- Maintains exact header formatting required by Ourvend
- Applies number formatting for prices and percentages
- Outputs: `product-import-YYYYMMDD.xlsx`

### 2. `generate-product-import-xls.js` (XLS Format)
Generates Excel files in legacy .xls format (Excel 97-2003).

**Features:**
- Uses xlsx library with BIFF8 format
- Compatible with older Excel versions
- Maintains exact header formatting
- Outputs: `product-import-YYYYMMDD.xls`

## Required Headers
The Ourvend system requires these exact headers in order:
1. Product barcode* (numeric only)
2. Product name*
3. Unit price*
4. Cost price
5. Supplier*
6. Specs
7. Type*
8. Promotion price
9. Member Price
10. Discount
11. Tax rate

*Fields marked with asterisk (*) are mandatory*

## SQL Query
Both scripts use this query to fetch product data:
```sql
SELECT 
  id AS 'Product barcode',
  name AS 'Product name',
  sales_price AS 'Unit price',
  purchase_price AS 'Cost price',
  'default' AS 'Supplier',
  '' AS 'Specs',
  'default' AS 'Type',
  sales_price AS 'Promotion price',
  sales_price AS 'Member Price',
  0 AS 'Discount',
  vat AS 'Tax rate'
FROM dbo.product
```

## Issues Encountered and Solutions

### Issue 1: Template Reading with ExcelJS
**Problem:** When using ExcelJS with template files, the column mapping didn't work correctly with `worksheet.addRow()` using object keys.

**Root Cause:** After clearing rows from a template, the column definitions weren't properly mapped to the keys being used.

**Solution:** When using a template, add rows as arrays (positional) instead of objects with keys:
```javascript
// Instead of this (doesn't work with templates):
worksheet.addRow({
  id: row.id,
  product_name: row.product_name,
  // ...
});

// Use this:
worksheet.addRow([
  row.id,
  row.product_name,
  // ... values in order
]);
```

### Issue 2: Empty Excel Files
**Problem:** Initial generation created files with only headers and no data (7KB files).

**Root Cause:** The addRow method with object keys wasn't working after loading a template.

**Solution:** Switch to array-based row addition when using templates.

### Issue 3: Column Formatting Errors
**Problem:** "Out of bounds" error when trying to format columns.

**Root Cause:** Using column index lookup on undefined columns after template loading.

**Solution:** Format cells directly by column letter instead of looking up column objects:
```javascript
// Instead of this:
worksheet.getColumn('tax_rate').numFmt = '0.00%';

// Use this:
worksheet.eachRow((row, rowNumber) => {
  const taxCell = row.getCell('K');
  taxCell.numFmt = '0.00%';
});
```

### Issue 4: WSL GUI Display
**Problem:** Browser automation couldn't display GUI on WSL initially.

**Solution:** WSL2 with WSLg support enables GUI applications. Confirmed with:
```bash
echo $DISPLAY  # Should show :0
```

## Usage

### Generate XLSX Format:
```bash
cd excel-upload
node generate-product-import.js
```

### Generate XLS Format:
```bash
cd excel-upload
node generate-product-import-xls.js
```

## Output Files
- **XLSX**: ~38-40KB, modern format, smaller file size
- **XLS**: ~148KB, legacy format, larger but more compatible

## Important Notes
1. Always verify that Supplier and Type values exist in Ourvend before import
2. Product barcode must be numeric only
3. The template file in Column L contains instructions, not data
4. Tax rates should be in decimal format (0.20 for 20%)
5. All mandatory fields must have values

## Troubleshooting
1. **File won't open**: Check file size - should be >30KB for XLSX, >100KB for XLS
2. **Module not found**: Run `npm install` from project root
3. **Connection timeout**: Verify Azure SQL Server allows your IP
4. **Template not found**: Check EXCEL_TEMPLATE_PATH in .env file

## Future Enhancements
- Add filtering options (active products only)
- Support for multiple sheets
- Automated upload to Ourvend after generation
- Batch processing with error reporting
- Image URL inclusion for product images