const fs = require('fs');
const path = require('path');

/**
 * Compare machine config JSON with server CSV export
 * Usage: node compare-config-with-csv.js <config.json> <export.csv>
 */

function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header (line 0)
  const dataLines = lines.slice(1);

  const slots = {};

  dataLines.forEach(line => {
    // Parse CSV line - handle commas in quoted fields
    const columns = line.split(',');

    if (columns.length < 10) return;

    const slotNumber = parseInt(columns[1]);
    const machinePrice = parseFloat(columns[7]) || 0;
    const productName = (columns[9] || '').trim();

    slots[slotNumber] = {
      slotNumber,
      productName,
      machinePrice
    };
  });

  return slots;
}

function loadConfigJson(configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const slots = {};
  config.slots.forEach(slot => {
    slots[slot.slotNumber] = {
      slotNumber: slot.slotNumber,
      productName: (slot.productName || '').trim(),
      machinePrice: slot.machinePrice || 0
    };
  });

  return {
    machineId: config.machineId,
    machineName: config.machineName,
    serial: config.serial,
    slots
  };
}

function compareSlots(configSlots, csvSlots) {
  const differences = [];

  // Get all slot numbers from both sources
  const allSlotNumbers = new Set([
    ...Object.keys(configSlots).map(k => parseInt(k)),
    ...Object.keys(csvSlots).map(k => parseInt(k))
  ]);

  for (const slotNumber of Array.from(allSlotNumbers).sort((a, b) => a - b)) {
    const configSlot = configSlots[slotNumber];
    const csvSlot = csvSlots[slotNumber];

    if (!configSlot && csvSlot) {
      differences.push({
        slotNumber,
        type: 'missing_in_config',
        csv: csvSlot
      });
      continue;
    }

    if (configSlot && !csvSlot) {
      differences.push({
        slotNumber,
        type: 'missing_in_csv',
        config: configSlot
      });
      continue;
    }

    const nameDiff = configSlot.productName !== csvSlot.productName;
    const priceDiff = Math.abs(configSlot.machinePrice - csvSlot.machinePrice) > 0.001;

    if (nameDiff || priceDiff) {
      differences.push({
        slotNumber,
        type: 'mismatch',
        differences: {
          ...(nameDiff && {
            productName: {
              config: configSlot.productName,
              csv: csvSlot.productName
            }
          }),
          ...(priceDiff && {
            machinePrice: {
              config: configSlot.machinePrice,
              csv: csvSlot.machinePrice
            }
          })
        }
      });
    }
  }

  return differences;
}

function printReport(config, differences) {
  console.log(`\n=== COMPARISON REPORT ===`);
  console.log(`Machine: ${config.machineName} (ID: ${config.machineId}, Serial: ${config.serial})\n`);

  if (differences.length === 0) {
    console.log('✓ No differences found! Config matches CSV perfectly.\n');
    return;
  }

  console.log(`Found ${differences.length} differences:\n`);

  differences.forEach(diff => {
    console.log(`Slot ${diff.slotNumber}:`);

    if (diff.type === 'missing_in_config') {
      console.log(`  ⚠️  Missing in config (exists in CSV)`);
      console.log(`     CSV: "${diff.csv.productName}" - €${diff.csv.machinePrice}`);
    } else if (diff.type === 'missing_in_csv') {
      console.log(`  ⚠️  Missing in CSV (exists in config)`);
      console.log(`     Config: "${diff.config.productName}" - €${diff.config.machinePrice}`);
    } else if (diff.type === 'mismatch') {
      if (diff.differences.productName) {
        console.log(`  Product Name:`);
        console.log(`     Config: "${diff.differences.productName.config}"`);
        console.log(`     CSV:    "${diff.differences.productName.csv}"`);
      }
      if (diff.differences.machinePrice) {
        console.log(`  Price:`);
        console.log(`     Config: €${diff.differences.machinePrice.config}`);
        console.log(`     CSV:    €${diff.differences.machinePrice.csv}`);
      }
    }
    console.log();
  });

  // Summary
  const missingInConfig = differences.filter(d => d.type === 'missing_in_config').length;
  const missingInCsv = differences.filter(d => d.type === 'missing_in_csv').length;
  const mismatches = differences.filter(d => d.type === 'mismatch').length;

  console.log(`=== SUMMARY ===`);
  console.log(`  Mismatches: ${mismatches}`);
  console.log(`  Missing in config: ${missingInConfig}`);
  console.log(`  Missing in CSV: ${missingInCsv}`);
  console.log(`  Total differences: ${differences.length}\n`);
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node compare-config-with-csv.js <config.json> <export.csv>');
  console.error('Example: node compare-config-with-csv.js machine-configs/machine-7-config.json "csv-validations/Slot information(2025_10_7).csv"');
  process.exit(1);
}

const configPath = args[0];
const csvPath = args[1];

if (!fs.existsSync(configPath)) {
  console.error(`Error: Config file not found: ${configPath}`);
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`Error: CSV file not found: ${csvPath}`);
  process.exit(1);
}

try {
  console.log('Loading config and CSV...');
  const config = loadConfigJson(configPath);
  const csvSlots = parseCsv(csvPath);

  console.log(`✓ Config loaded: ${Object.keys(config.slots).length} slots`);
  console.log(`✓ CSV loaded: ${Object.keys(csvSlots).length} slots`);

  const differences = compareSlots(config.slots, csvSlots);
  printReport(config, differences);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
