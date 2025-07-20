# Excel Upload Module - AI Assistant Context

## Module Purpose
This module generates Excel files from Azure SQL Server product data for bulk import into the Ourvend vending machine management system. It bridges the gap between the ERP system (SQL Server) and Ourvend's web-based import functionality.

## Key Technical Details

### Dependencies
- **exceljs**: For modern Excel (.xlsx) file generation with template support
- **xlsx**: For legacy Excel (.xls) file generation in BIFF8 format
- **mssql**: Azure SQL Server connectivity with encryption support
- **dotenv**: Environment variable management for credentials

### File Formats
1. **XLSX (Modern)**: Uses ExcelJS, supports templates, ~40KB output
2. **XLS (Legacy)**: Uses xlsx library, Excel 97-2003 compatible, ~148KB output

### Critical Header Requirements
The Ourvend import system requires EXACT header names with specific formatting:
```
Product barcode*  | Product name*  | Unit price*  | Cost price  | Supplier*  | Specs  | Type*  | Promotion price  | Member Price  | Discount  | Tax rate
```
*Note: Asterisks are part of the header names, not just indicators*

### Database Query Pattern
```sql
SELECT 
  id,                           -- Maps to: Product barcode*
  name AS product_name,         -- Maps to: Product name*
  sales_price AS unit_price,    -- Maps to: Unit price*
  purchase_price AS cost_price, -- Maps to: Cost price
  'default' AS supplier,        -- Maps to: Supplier*
  '' AS specs,                  -- Maps to: Specs
  'default' AS type,            -- Maps to: Type*
  sales_price as promotion_price, -- Maps to: Promotion price
  sales_price as member_price,  -- Maps to: Member Price
  0 as discount,                -- Maps to: Discount
  vat as tax_rate              -- Maps to: Tax rate
FROM dbo.product
```

## Common Issues and Solutions

### ExcelJS Template Handling
**Issue**: Column mapping fails when using templates
**Solution**: Use array-based row addition instead of object-based:
```javascript
// ❌ Doesn't work with templates
worksheet.addRow({ id: row.id, product_name: row.product_name });

// ✅ Works with templates
worksheet.addRow([row.id, row.product_name, ...]);
```

### File Generation Validation
Always check generated file size:
- XLSX: Should be >30KB for valid data
- XLS: Should be >100KB for valid data
- Small files (7-10KB) indicate only headers were written

### WSL Considerations
- GUI applications work with WSLg (check with `echo $DISPLAY`)
- File paths use forward slashes
- Ensure proper permissions for Excel file creation

## Script Usage Patterns

### XLSX Generation
```bash
cd excel-upload
node generate-product-import.js
# Output: product-import-YYYYMMDD.xlsx
```

### XLS Generation
```bash
cd excel-upload
node generate-product-import-xls.js
# Output: product-import-YYYYMMDD.xls
```

## Integration Points

### With Ourvend System
1. Generated files are formatted for Ourvend's batch import feature
2. Headers must match exactly (including asterisks)
3. Product barcode must be numeric only
4. Supplier and Type must pre-exist in Ourvend

### With ERP System
1. Reads from Azure SQL Server (SpaetiToGo database)
2. Maps ERP fields to Ourvend's expected format
3. Handles null values with appropriate defaults

## Security Considerations
- Database credentials in .env file (gitignored)
- Azure SQL requires encrypted connections
- No sensitive data logged to console

## Future Enhancement Opportunities
1. Add product image URLs to export
2. Implement incremental updates (only changed products)
3. Add validation for supplier/type existence
4. Create reverse import (Ourvend → ERP)
5. Add scheduling for automated daily exports

## Important Notes for AI Assistants
1. **Never modify header names** - They must match Ourvend's expectations exactly
2. **Always test file generation** by checking file size and row count
3. **Template preservation is critical** - Don't overwrite template structure
4. **Use positional array addition** when working with templates in ExcelJS
5. **Default values matter** - 'default' for supplier/type, 0 for discount, etc.