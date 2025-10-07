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
    enableArithAbort: true,
    requestTimeout: 30000
  }
};

async function queryMachine7() {
  let pool;

  try {
    console.log('Connecting to Azure SQL Server...');
    pool = await sql.connect(config);
    console.log('✓ Connected to database\n');

    // Get machine table structure
    console.log('=== MACHINE TABLE STRUCTURE ===\n');
    const columnsResult = await pool.request().query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'machine'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns:');
    columnsResult.recordset.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}`);
    });

    // Get machine ID 7 details
    console.log('\n=== MACHINE ID 7 DETAILS ===\n');
    const machineResult = await pool.request()
      .input('machineId', sql.Int, 7)
      .query('SELECT * FROM machine WHERE id = @machineId');

    if (machineResult.recordset.length > 0) {
      console.log('Machine found:');
      console.log(JSON.stringify(machineResult.recordset[0], null, 2));
    } else {
      console.log('Machine ID 7 not found!');
    }

    // Get all machines for reference
    console.log('\n=== ALL MACHINES ===\n');
    const allMachinesResult = await pool.request()
      .query('SELECT * FROM machine ORDER BY id');

    console.log(`Found ${allMachinesResult.recordset.length} machines:\n`);
    allMachinesResult.recordset.forEach(machine => {
      console.log(`ID ${machine.id}: ${JSON.stringify(machine)}`);
    });

    // Check machine_product table
    console.log('\n=== MACHINE_PRODUCT TABLE (Slot Assignments) ===\n');
    const machineProductCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'machine_product'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns:');
    machineProductCols.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });

    // Get machine 7's product assignments
    const machine7Products = await pool.request()
      .input('machineId', sql.Int, 7)
      .query('SELECT * FROM machine_product WHERE machine_id = @machineId ORDER BY position');

    console.log(`\nMachine 7 has ${machine7Products.recordset.length} slot assignments:\n`);
    if (machine7Products.recordset.length > 0) {
      machine7Products.recordset.forEach(slot => {
        console.log(`Position ${slot.position}: ${JSON.stringify(slot)}`);
      });
    }

    // Check product_placement table
    console.log('\n=== PRODUCT_PLACEMENT TABLE ===\n');
    const productPlacementCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'product_placement'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns:');
    productPlacementCols.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });

    const machine7Placements = await pool.request()
      .input('machineId', sql.Int, 7)
      .query('SELECT * FROM product_placement WHERE machine_id = @machineId ORDER BY id');

    console.log(`\nMachine 7 has ${machine7Placements.recordset.length} product placements:\n`);
    if (machine7Placements.recordset.length > 0) {
      machine7Placements.recordset.forEach(placement => {
        console.log(`Placement ID ${placement.id}: ${JSON.stringify(placement)}`);
      });
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
queryMachine7();
