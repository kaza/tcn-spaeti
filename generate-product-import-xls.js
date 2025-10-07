const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sql = require('mssql');
const XLSX = require('xlsx');

// SQL Server configuration
const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  port: parseInt(process.env.SQL_PORT || '1433'),
  options: {
    encrypt: true, // Required for Azure
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

// Generate filename with current date
function getOutputFilename() {
  const date = new Date();
  const dateStr = date.getFullYear() + 
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0') + '_' +
    String(date.getHours()).padStart(2, '0') +
    String(date.getMinutes()).padStart(2, '0');
  return `product-import-${dateStr}.xls`;
}

async function generateProductImportXLS() {
  let pool;
  
  try {
    console.log('Connecting to Azure SQL Server...');
    pool = await sql.connect(config);
    console.log('✓ Connected to database');

    // Execute query
    console.log('Executing product query...');
    const result = await pool.request().query(`
      SELECT 
        id, 
        LEFT(name, 49) AS product_name, 
        sales_price AS unit_price, 
        purchase_price AS cost_price, 
        'default' AS supplier, 
        '' AS specs, 
        'default' AS type, 
        sales_price as promotion_price, 
        sales_price as member_price, 
        0 as discount, 
        vat as tax_rate
      FROM dbo.product
    `);
    
    console.log(`✓ Retrieved ${result.recordset.length} products`);

    // Read the template file
    console.log('Reading template file...');
    const templatePath = path.join(__dirname, 'BatchImportTemplates.xls');
    let wb;
    
    try {
      wb = XLSX.readFile(templatePath);
      console.log('✓ Template loaded successfully');
    } catch (err) {
      console.error('⚠️ Could not read template:', err.message);
      // Fall back to creating new workbook if template not found
      console.log('Creating new workbook...');
      wb = XLSX.utils.book_new();
    }

    // Get the first worksheet or create one
    let ws;
    const sheetName = wb.SheetNames[0] || 'Products';
    
    if (wb.SheetNames.length > 0) {
      ws = wb.Sheets[sheetName];
      console.log(`✓ Using existing worksheet: ${sheetName}`);
      
      // Get the range of the existing sheet
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      // Clear all data rows (keep header row)
      for (let row = range.e.r; row > 0; row--) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          delete ws[cellAddress];
        }
      }
      
      // Update the range to only include the header
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });
    } else {
      // Create new worksheet if template is empty
      console.log('Creating new worksheet...');
      const headers = [
        'Product barcode*',
        'Product name*', 
        'Unit price*',
        'Cost price',
        'Supplier*',
        'Specs',
        'Type*',
        'Promotion price',
        'Member Price',
        'Discount',
        'Tax rate'
      ];
      ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // Add product data starting from row 2 (row 1 is header)
    console.log('Adding product data...');
    let rowIndex = 1; // Start after header
    
    result.recordset.forEach(row => {
      const rowData = [
        row.id,
        row.product_name || '',
        row.unit_price || 0,
        row.cost_price || 0,
        row.supplier,
        row.specs || '',
        row.type,
        row.promotion_price || 0,
        row.member_price || 0,
        row.discount || 0,
        row.tax_rate || 0
      ];
      
      // Add each cell individually
      rowData.forEach((value, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        ws[cellAddress] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
      });
      
      rowIndex++;
    });
    
    // Update the worksheet range
    ws['!ref'] = XLSX.utils.encode_range({ 
      s: { r: 0, c: 0 }, 
      e: { r: rowIndex - 1, c: 10 } 
    });

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Product barcode*
      { wch: 30 }, // Product name*
      { wch: 15 }, // Unit price*
      { wch: 15 }, // Cost price
      { wch: 20 }, // Supplier*
      { wch: 20 }, // Specs
      { wch: 15 }, // Type*
      { wch: 15 }, // Promotion price
      { wch: 15 }, // Member Price
      { wch: 10 }, // Discount
      { wch: 10 }  // Tax rate
    ];
    ws['!cols'] = colWidths;

    // Save the file
    const outputPath = path.join(__dirname, 'excel-imports', getOutputFilename());

    // Write as XLS (BIFF8 format)
    XLSX.writeFile(wb, outputPath, { bookType: 'xls' });

    console.log(`✓ XLS file saved: ${outputPath}`);
    console.log(`✓ Total products exported: ${result.recordset.length}`);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('✓ Database connection closed');
    }
  }
}

// Run the script
generateProductImportXLS();