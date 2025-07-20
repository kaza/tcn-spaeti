const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sql = require('mssql');
const ExcelJS = require('exceljs');

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
    String(date.getDate()).padStart(2, '0');
  return `product-import-${dateStr}.xlsx`;
}

async function generateProductImport() {
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
        name AS product_name, 
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

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, '..', process.env.EXCEL_TEMPLATE_PATH);
    
    // Try to read the template
    let worksheet;
    try {
      console.log('Reading template file...');
      await workbook.xlsx.readFile(templatePath);
      worksheet = workbook.worksheets[0];
      console.log('✓ Template loaded successfully');
      
      // Clear existing data (keep headers)
      const rowCount = worksheet.rowCount;
      for (let i = rowCount; i > 1; i--) {
        worksheet.spliceRows(i, 1);
      }
    } catch (err) {
      console.log('⚠️ Could not read template, creating new workbook');
      worksheet = workbook.addWorksheet('Products');
      
      // Add headers - must match exact template format
      console.log('Adding headers...');
      worksheet.columns = [
        { header: 'Product barcode*', key: 'id', width: 20 },
        { header: 'Product name*', key: 'product_name', width: 30 },
        { header: 'Unit price*', key: 'unit_price', width: 15 },
        { header: 'Cost price', key: 'cost_price', width: 15 },
        { header: 'Supplier*', key: 'supplier', width: 20 },
        { header: 'Specs', key: 'specs', width: 20 },
        { header: 'Type*', key: 'type', width: 15 },
        { header: 'Promotion price', key: 'promotion_price', width: 15 },
        { header: 'Member Price', key: 'member_price', width: 15 },
        { header: 'Discount', key: 'discount', width: 10 },
        { header: 'Tax rate', key: 'tax_rate', width: 10 }
      ];
    }

    // Add data rows
    console.log('Adding product data...');
    result.recordset.forEach(row => {
      // When using template, add rows as array to preserve column order
      worksheet.addRow([
        row.id,
        row.product_name || '',
        row.unit_price || 0,
        row.cost_price || 0,
        row.supplier,
        row.specs,
        row.type,
        row.promotion_price || 0,
        row.member_price || 0,
        row.discount,
        row.tax_rate || 0
      ]);
    });

    // Format columns by finding them in the worksheet
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      // Format price columns
      ['C', 'D', 'H', 'I'].forEach(col => {
        const cell = row.getCell(col);
        if (cell.value !== null && cell.value !== undefined) {
          cell.numFmt = '#,##0.00';
        }
      });
      
      // Format percentage columns
      const taxCell = row.getCell('K');
      if (taxCell.value !== null && taxCell.value !== undefined) {
        taxCell.numFmt = '0.00%';
      }
      
      const discountCell = row.getCell('J');
      if (discountCell.value !== null && discountCell.value !== undefined) {
        discountCell.numFmt = '0%';
      }
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Save the file
    const outputPath = path.join(__dirname, getOutputFilename());
    await workbook.xlsx.writeFile(outputPath);
    
    console.log(`✓ Excel file saved: ${outputPath}`);
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
generateProductImport();