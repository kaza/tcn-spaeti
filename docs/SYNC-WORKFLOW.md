# Database to Cloud Sync Workflow

## Overview
This workflow syncs vending machine configurations from the local SQL Server database to the Ourvend cloud platform using browser automation.

## Architecture

```
┌─────────────────┐
│  SQL Server DB  │  ← Source of truth
│  (SpaetiToGo)   │
└────────┬────────┘
         │
         │ 1. Generate config
         ▼
┌─────────────────┐
│  machine-X.json │  ← Individual machine config
└────────┬────────┘
         │
         │ 2. Sync to cloud
         ▼
┌─────────────────┐
│ Ourvend Cloud   │  ← Destination
│  Web Interface  │
└─────────────────┘
```

## Workflow Steps

### Step 1: Generate Machine Config from Database

**Command:**
```bash
node generate-machine-config.js <machine_id>
```

**Example:**
```bash
node generate-machine-config.js 7
```

**What it does:**
1. Connects to SQL Server (SpaetiToGo database)
2. Queries machine ID 7 details from `machine` table
3. Queries all slot assignments from `machine_product` table
4. Joins with `product` table to get product names
5. Generates `machine-7-config.json` file

**Output file format:** `machine-{id}-config.json`

**Sample output:**
```json
{
  "machineId": 7,
  "machineGrouping": "1050",
  "machineName": "Cips (5) 2503060046",
  "remoteId": 3060046,
  "serial": "2503060046",
  "slots": [
    {
      "slotNumber": 1,
      "productName": "Nic Nacs Double Crunch Peanuts",
      "machinePrice": 3.8,
      "userDefinedPrice": 3.8,
      "capacity": 199,
      "existing": 199,
      "weChatDiscount": 100,
      "alipayDiscount": 100,
      "idCardDiscount": 100,
      "alertingQuantity": ""
    }
  ]
}
```

---

### Step 2: Sync Machine Config to Ourvend Cloud

**Command:**
```bash
node sync-machine-to-cloud.js <config-file>
```

**Example:**
```bash
node sync-machine-to-cloud.js machine-7-config.json
```

**What it does:**
1. Launches Playwright browser (Chromium)
2. Logs into Ourvend platform
3. Navigates to Slot Management section
4. Selects the machine using grouping + name
5. For each slot in the config:
   - Opens slot edit modal
   - Updates product assignment
   - Updates machine price
   - Updates user-defined price
   - Saves changes
6. Provides summary of successful/failed updates

**Duration:** ~2-5 minutes per machine (depending on slot count)

---

## Complete Example: Sync Machine 7

```bash
# Step 1: Generate config from database
node generate-machine-config.js 7

# Output: machine-7-config.json created with 58 slots

# Step 2: Sync to Ourvend cloud
node sync-machine-to-cloud.js machine-7-config.json

# Output: Browser automation updates all 58 slots
```

---

## Configuration Files

### One Config Per Machine
Each machine has its own configuration file:

- `machine-7-config.json` - Cips (5) 2503060046
- `machine-8-config.json` - Slatkisi (5) 2503050187
- `machine-6-config.json` - Slatkisi (4)- 2503060047
- etc.

**Benefits:**
- Easy to manage individual machines
- Can sync one machine at a time
- Changes to one machine don't affect others
- Better version control

---

## Database Schema Reference

### machine table
```sql
SELECT
  id,                    -- Machine ID (7)
  name,                  -- Machine name for Ourvend dropdown
  tcn_machine_group,     -- Machine grouping for Ourvend dropdown
  remote_id,             -- Ourvend remote ID
  serial                 -- Machine serial number
FROM machine
WHERE id = 7
```

### machine_product table (slot assignments)
```sql
SELECT
  mp.position,           -- Slot number ("001", "003", etc.)
  mp.price,              -- Slot-specific price
  p.name AS product_name -- Product name
FROM machine_product mp
LEFT JOIN product p ON mp.product_id = p.id
WHERE mp.machine_id = 7
  AND mp.product_id IS NOT NULL
ORDER BY CAST(mp.position AS INT)
```

---

## Troubleshooting

### Issue: "Machine ID X not found"
**Solution:** Check that machine exists in database:
```sql
SELECT * FROM machine WHERE id = X
```

### Issue: "Machine has no tcn_machine_group set"
**Solution:** Machine cannot be synced without a grouping value:
```sql
UPDATE machine
SET tcn_machine_group = '1050'
WHERE id = X
```

### Issue: "Slot X not found" during sync
**Cause:** Slot doesn't exist in Ourvend or has different number
**Solution:** Check slot numbering in Ourvend web interface

### Issue: "Product not found in dropdown"
**Cause:** Product name in DB doesn't match Ourvend exactly
**Solution:** Update product name in database or Ourvend

---

## Advanced Usage

### Sync Multiple Machines
```bash
# Generate configs
node generate-machine-config.js 6
node generate-machine-config.js 7
node generate-machine-config.js 8

# Sync each machine
node sync-machine-to-cloud.js machine-6-config.json
node sync-machine-to-cloud.js machine-7-config.json
node sync-machine-to-cloud.js machine-8-config.json
```

### Regenerate Config (Re-sync from DB)
```bash
# Database has been updated, regenerate config
node generate-machine-config.js 7

# This overwrites machine-7-config.json with latest DB data

# Then sync to cloud
node sync-machine-to-cloud.js machine-7-config.json
```

### Dry Run (Review Config Before Sync)
```bash
# Generate config
node generate-machine-config.js 7

# Review the JSON file manually
cat machine-7-config.json | head -50

# If everything looks good, sync
node sync-machine-to-cloud.js machine-7-config.json
```

---

## Scripts Reference

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `generate-machine-config.js` | Generate config from DB | Machine ID | JSON config file |
| `sync-machine-to-cloud.js` | Sync config to Ourvend | Config file | Updated cloud slots |
| `query-machine-7.js` | Inspect machine 7 details | None | Console output |
| `explore-database.js` | Explore DB schema | None | Console output |

---

## Database Schema Documentation

See `DATABASE-SCHEMA.md` for complete database structure, relationships, and field mappings.

---

## Environment Setup

Requires `.env` file:
```
SQL_USER=your_username
SQL_PASSWORD=your_password
SQL_SERVER=your_server.database.windows.net
SQL_DATABASE=SpaetiToGo
SQL_PORT=1433

OURVEND_USERNAME=your_ourvend_username
OURVEND_PASSWORD=your_ourvend_password
```

---

## Future Enhancements

1. **Batch sync script** - Sync multiple machines in one command
2. **Diff checking** - Only sync changed slots
3. **Backup before sync** - Save current cloud state
4. **Scheduling** - Automated daily syncs via cron
5. **API mode** - Direct API calls (if Ourvend provides API)
