const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sql = require('mssql');

// SQL Server configuration
const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  port: parseInt(process.env.SQL_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

async function exploreDatabase() {
  let pool;

  try {
    console.log('Connecting to Azure SQL Server...');
    pool = await sql.connect(config);
    console.log('✓ Connected to database\n');

    // Get all tables
    console.log('=== DATABASE TABLES ===\n');
    const tablesResult = await pool.request().query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `);

    console.log(`Found ${tablesResult.recordset.length} tables:\n`);
    tablesResult.recordset.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    // Get detailed information for each table
    console.log('\n=== TABLE STRUCTURES ===\n');

    for (const table of tablesResult.recordset) {
      console.log(`\n--- Table: ${table.TABLE_NAME} ---`);

      // Get columns
      const columnsResult = await pool.request()
        .input('tableName', sql.NVarChar, table.TABLE_NAME)
        .query(`
          SELECT
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `);

      console.log('Columns:');
      columnsResult.recordset.forEach(col => {
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
        console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}${defaultVal}`);
      });

      // Get row count
      const countResult = await pool.request()
        .query(`SELECT COUNT(*) as count FROM [${table.TABLE_NAME}]`);
      console.log(`\nRow count: ${countResult.recordset[0].count}`);
    }

    // Get foreign key relationships
    console.log('\n\n=== FOREIGN KEY RELATIONSHIPS ===\n');
    const fkResult = await pool.request().query(`
      SELECT
        fk.name AS FK_Name,
        tp.name AS Parent_Table,
        cp.name AS Parent_Column,
        tr.name AS Referenced_Table,
        cr.name AS Referenced_Column
      FROM sys.foreign_keys AS fk
      INNER JOIN sys.foreign_key_columns AS fkc
        ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables AS tp
        ON fkc.parent_object_id = tp.object_id
      INNER JOIN sys.columns AS cp
        ON fkc.parent_object_id = cp.object_id
        AND fkc.parent_column_id = cp.column_id
      INNER JOIN sys.tables AS tr
        ON fkc.referenced_object_id = tr.object_id
      INNER JOIN sys.columns AS cr
        ON fkc.referenced_object_id = cr.object_id
        AND fkc.referenced_column_id = cr.column_id
      ORDER BY tp.name, fk.name
    `);

    if (fkResult.recordset.length > 0) {
      fkResult.recordset.forEach(fk => {
        console.log(`${fk.Parent_Table}.${fk.Parent_Column} → ${fk.Referenced_Table}.${fk.Referenced_Column}`);
        console.log(`  (FK: ${fk.FK_Name})\n`);
      });
    } else {
      console.log('No foreign key relationships found.');
    }

    // Look for machine table specifically
    console.log('\n=== MACHINE TABLE DETAILS ===\n');
    const machineTableCheck = tablesResult.recordset.find(t =>
      t.TABLE_NAME.toLowerCase().includes('machine') ||
      t.TABLE_NAME.toLowerCase().includes('vending')
    );

    if (machineTableCheck) {
      console.log(`Found table: ${machineTableCheck.TABLE_NAME}\n`);

      // Get sample data
      const sampleData = await pool.request()
        .query(`SELECT TOP 10 * FROM [${machineTableCheck.TABLE_NAME}]`);

      console.log('Sample data:');
      console.log(JSON.stringify(sampleData.recordset, null, 2));
    } else {
      console.log('No obvious machine table found. Searching all tables for machine ID 7...\n');

      // Search for machine ID 7 in all tables
      for (const table of tablesResult.recordset) {
        try {
          const searchResult = await pool.request()
            .query(`SELECT TOP 5 * FROM [${table.TABLE_NAME}] WHERE id = 7 OR machine_id = 7`);

          if (searchResult.recordset.length > 0) {
            console.log(`\nFound in table: ${table.TABLE_NAME}`);
            console.log(JSON.stringify(searchResult.recordset, null, 2));
          }
        } catch (err) {
          // Column might not exist, skip
        }
      }
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n✓ Database connection closed');
    }
  }
}

// Run the script
exploreDatabase();
