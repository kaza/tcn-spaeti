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

async function generateMachineConfig(machineId) {
  let pool;

  try {
    console.log(`\n=== GENERATING CONFIG FOR MACHINE ${machineId} ===\n`);
    console.log('Connecting to Azure SQL Server...');
    pool = await sql.connect(config);
    console.log('✓ Connected to database\n');

    // Get machine details
    console.log(`Fetching machine ${machineId} details...`);
    const machineResult = await pool.request()
      .input('machineId', sql.Int, machineId)
      .query('SELECT * FROM machine WHERE id = @machineId');

    if (machineResult.recordset.length === 0) {
      console.error(`❌ Machine ID ${machineId} not found in database!`);
      process.exit(1);
    }

    const machine = machineResult.recordset[0];
    console.log(`✓ Found machine: ${machine.name}`);

    if (!machine.tcn_machine_group) {
      console.error(`❌ Machine ${machineId} has no tcn_machine_group set!`);
      console.error('This machine cannot be synced to Ourvend without a machine grouping.');
      process.exit(1);
    }

    console.log(`  Machine Grouping: ${machine.tcn_machine_group}`);
    console.log(`  Remote ID: ${machine.remote_id}`);
    console.log(`  Serial: ${machine.serial}\n`);

    // Get all slots (including empty ones) with product details
    console.log('Fetching slot configurations (including empty slots)...');
    const slotsResult = await pool.request()
      .input('machineId', sql.Int, machineId)
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
        ORDER BY CAST(mp.position AS INT)
      `);

    const slotsWithProducts = slotsResult.recordset.filter(s => s.product_id !== null).length;
    const emptySlots = slotsResult.recordset.length - slotsWithProducts;

    console.log(`✓ Found ${slotsResult.recordset.length} total slots:`);
    console.log(`  - ${slotsWithProducts} slots with products`);
    console.log(`  - ${emptySlots} empty slots (will be cleared)\n`);

    // Convert to slot configuration format
    // Empty slots (product_id IS NULL) will have empty productName and trigger clear
    const slots = slotsResult.recordset.map(slot => ({
      slotNumber: parseInt(slot.position),
      productName: slot.product_name || "",  // Empty string for slots without products
      machinePrice: slot.price || 0,
      userDefinedPrice: slot.price || 0,
      capacity: slot.product_id ? 199 : 0,  // 0 capacity for empty slots
      existing: slot.product_id ? 199 : 0,  // 0 existing for empty slots
      weChatDiscount: 100,
      alipayDiscount: 100,
      idCardDiscount: 100,
      alertingQuantity: ""
    }));

    // Create machine config
    const machineConfig = {
      machineId: machineId,
      machineGrouping: machine.tcn_machine_group,
      machineName: machine.name,
      remoteId: machine.remote_id,
      serial: machine.serial,
      slots: slots
    };

    // Save to individual machine config file
    const configPath = path.join(__dirname, 'machine-configs', `machine-${machineId}-config.json`);
    fs.writeFileSync(configPath, JSON.stringify(machineConfig, null, 2));

    console.log(`✓ Configuration saved to: machine-configs/machine-${machineId}-config.json`);
    console.log(`\n=== SUMMARY ===`);
    console.log(`  Machine ID: ${machineId}`);
    console.log(`  Machine Name: ${machineConfig.machineName}`);
    console.log(`  Machine Grouping: ${machineConfig.machineGrouping}`);
    console.log(`  Total slots configured: ${machineConfig.slots.length}`);

    if (slots.length > 0) {
      console.log(`\nFirst 5 slots:`);
      machineConfig.slots.slice(0, 5).forEach(slot => {
        console.log(`  Slot ${slot.slotNumber}: ${slot.productName} - €${slot.machinePrice}`);
      });
    }

    console.log(`\n✓ Ready to sync! Run:`);
    console.log(`  node sync-machine-to-cloud.js machine-configs/machine-${machineId}-config.json\n`);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Get machine ID from command line argument
const machineId = process.argv[2];

if (!machineId) {
  console.error('Usage: node generate-machine-config.js <machine_id>');
  console.error('Example: node generate-machine-config.js 7');
  process.exit(1);
}

if (isNaN(parseInt(machineId))) {
  console.error('Error: Machine ID must be a number');
  process.exit(1);
}

// Run the script
generateMachineConfig(parseInt(machineId));
