const path = require('path');
const fs = require('fs');
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

async function generateMachine7Config() {
  let pool;

  try {
    console.log('Connecting to Azure SQL Server...');
    pool = await sql.connect(config);
    console.log('✓ Connected to database\n');

    // Get machine 7 details
    console.log('=== MACHINE ID 7 DETAILS ===\n');
    const machineResult = await pool.request()
      .input('machineId', sql.Int, 7)
      .query('SELECT * FROM machine WHERE id = @machineId');

    const machine = machineResult.recordset[0];
    console.log(`Machine: ${machine.name}`);
    console.log(`Machine Grouping: ${machine.tcn_machine_group}`);
    console.log(`Remote ID: ${machine.remote_id}\n`);

    // Get all slots with product details
    console.log('=== FETCHING SLOT CONFIGURATIONS ===\n');
    const slotsResult = await pool.request()
      .input('machineId', sql.Int, 7)
      .query(`
        SELECT
          mp.position,
          mp.label,
          mp.price,
          p.name AS product_name,
          p.id AS product_id
        FROM machine_product mp
        LEFT JOIN product p ON mp.product_id = p.id
        WHERE mp.machine_id = @machineId
          AND mp.product_id IS NOT NULL
        ORDER BY CAST(mp.position AS INT)
      `);

    console.log(`Found ${slotsResult.recordset.length} slots with products assigned\n`);

    // Convert to slot configuration format
    const slots = slotsResult.recordset.map(slot => ({
      slotNumber: parseInt(slot.position),
      productName: slot.product_name || `Product ${slot.product_id}`,
      machinePrice: slot.price || 0,
      userDefinedPrice: slot.price || 0,
      capacity: 199,
      existing: 199,
      weChatDiscount: 100,
      alipayDiscount: 100,
      idCardDiscount: 100,
      alertingQuantity: ""
    }));

    // Create machine config
    const machineConfig = {
      machineGrouping: machine.tcn_machine_group,
      machineId: machine.name,
      slots: slots
    };

    // Read existing config
    const configPath = path.join(__dirname, 'slot-configurations.json');
    let existingConfig = [];

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      existingConfig = JSON.parse(configContent);
      console.log(`Loaded existing config with ${existingConfig.length} machines\n`);
    }

    // Check if machine 7 already exists in config
    const existingIndex = existingConfig.findIndex(m =>
      m.machineId === machineConfig.machineId
    );

    if (existingIndex >= 0) {
      console.log('Machine 7 already exists in config, replacing...\n');
      existingConfig[existingIndex] = machineConfig;
    } else {
      console.log('Adding machine 7 to config...\n');
      existingConfig.push(machineConfig);
    }

    // Save updated config
    fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

    console.log('✓ Configuration saved to slot-configurations.json');
    console.log(`\nSummary:`);
    console.log(`  Machine: ${machineConfig.machineId}`);
    console.log(`  Machine Grouping: ${machineConfig.machineGrouping}`);
    console.log(`  Total slots configured: ${machineConfig.slots.length}`);
    console.log(`\nFirst 5 slots:`);
    machineConfig.slots.slice(0, 5).forEach(slot => {
      console.log(`  Slot ${slot.slotNumber}: ${slot.productName} - €${slot.machinePrice}`);
    });

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
generateMachine7Config();
