# Ourvend Sync Tools Guide

## Overview
This repository contains 4 essential tools for managing the complete workflow from product import to cloud synchronization and validation.

## 🔄 Complete Workflow (3 Steps)

```
┌─────────────────────────────────────────────────┐
│ STEP 1: Import Products (Upstream)              │
│                                                  │
│ Database ──> Excel (.xls) ──> Ourvend Import   │
│ Tool: generate-product-import-xls.js            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ STEP 2: Assign Products to Slots (Downstream)   │
│                                                  │
│ Database ──> JSON Config ──> Ourvend Cloud      │
│ Tools: generate-machine-config.js               │
│        sync-machine-to-cloud.js                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ STEP 3: Verify Sync (Post-Sync Validation)      │
│                                                  │
│ Cloud CSV Download ──> Compare with Database    │
│ Tool: compare-config-with-csv.js                │
└─────────────────────────────────────────────────┘
```

---

## 📋 Tool Reference

### 1️⃣ generate-product-import-xls.js
**Purpose:** Generate Excel file for bulk product import into Ourvend

**Usage:**
```bash
node generate-product-import-xls.js
```

**What it does:**
- Connects to SQL Server database
- Queries all products from `product` table
- Generates Excel file in `.xls` format (required by Ourvend)
- Output: `excel-imports/product-import-YYYYMMDD_HHMM.xls`

**When to use:**
- Initial product catalog setup
- Bulk product updates
- Adding new products to Ourvend platform

**Output location:** `excel-imports/`

**Next step:** Manually upload the Excel file to Ourvend's bulk import interface

---

### 2️⃣ generate-machine-config.js
**Purpose:** Generate JSON configuration for a specific vending machine from database

**Usage:**
```bash
node generate-machine-config.js <machine_id>
```

**Example:**
```bash
node generate-machine-config.js 7
```

**What it does:**
1. Connects to SQL Server (SpaetiToGo database)
2. Queries machine details from `machine` table
3. Queries all slot assignments from `machine_product` table
4. Joins with `product` table to get product names
5. Generates `machine-configs/machine-<id>-config.json` file

**Output format:**
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
      "productName": "Product Name Here",
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

**Output location:** `machine-configs/machine-<id>-config.json`

**When to use:**
- Before syncing machine slots to cloud
- When prices or slot assignments change in database
- To review current machine configuration

**Next step:** Use `sync-machine-to-cloud.js` with the generated config file

---

### 3️⃣ sync-machine-to-cloud.js
**Purpose:** Sync machine configuration to Ourvend cloud using browser automation

**Usage:**
```bash
node sync-machine-to-cloud.js <config-file>
```

**Example:**
```bash
node sync-machine-to-cloud.js machine-configs/machine-7-config.json
```

**What it does:**
1. Launches Playwright browser (Chromium)
2. Logs into Ourvend platform
3. Navigates to Slot Management section
4. Selects machine using grouping + name
5. For each slot in config:
   - Opens slot edit modal
   - Updates product assignment
   - Updates machine price
   - Updates user-defined price
   - Saves changes
6. Reports summary of successful/failed updates

**Duration:** ~2-5 minutes per machine (depending on slot count)

**Output:** Console summary + screenshots in `screenshots/` directory

**When to use:**
- After generating fresh config from database
- When slot assignments or prices change
- For individual machine updates

**Prerequisites:**
- Valid config file from `generate-machine-config.js`
- Ourvend credentials in `.env` file
- Machine must exist in Ourvend with matching grouping/name

**Retry on failure:** If product not found or slot issues occur, check:
- Product names match exactly between DB and Ourvend
- Slot numbers exist in Ourvend
- Machine grouping/name are correct

---

### 4️⃣ compare-config-with-csv.js
**Purpose:** Validate cloud sync by comparing database config with exported CSV from Ourvend

**Usage:**
```bash
node compare-config-with-csv.js
```

**What it does:**
1. Loads machine config from `machine-configs/machine-7-config.json`
2. Loads exported CSV from `csv-validations/`
3. Compares each slot's product assignment and pricing
4. Reports discrepancies or confirms sync success

**When to use:**
- After running `sync-machine-to-cloud.js`
- To verify slot assignments are correct
- For periodic audits of cloud vs database state

**Prerequisites:**
1. Run `generate-machine-config.js` first
2. Run `sync-machine-to-cloud.js`
3. Export slot information CSV from Ourvend web interface
4. Place CSV in `csv-validations/` directory

**Output:** Console report showing matches/mismatches

---

## 🗂️ Directory Structure

```
/
├── generate-product-import-xls.js     ← Tool 1: Product import
├── generate-machine-config.js         ← Tool 2a: Config generation
├── sync-machine-to-cloud.js           ← Tool 2b: Cloud sync
├── compare-config-with-csv.js         ← Tool 3: Validation
│
├── machine-configs/                   ← Production machine configs
│   └── machine-7-config.json
│
├── test-configs/                      ← Test/development configs
│
├── csv-validations/                   ← CSV exports for validation
│   └── Slot information(YYYY_MM_DD).csv
│
├── excel-imports/                     ← Generated Excel files
│   └── product-import-YYYYMMDD_HHMM.xls
│
├── screenshots/                       ← Browser automation screenshots
│
├── docs/                              ← Documentation
│   ├── SYNC-WORKFLOW.md
│   ├── DATABASE-SCHEMA.md
│   └── ...
│
└── archive/                           ← Deprecated/old files
```

---

## 🔧 Environment Setup

Create a `.env` file in root:

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

## 📖 Complete Example: Sync Machine 7

### Step 1: Import Products (if needed)
```bash
node generate-product-import-xls.js
# Output: excel-imports/product-import-20251007_1540.xls
# Manually upload to Ourvend bulk import
```

### Step 2a: Generate Config
```bash
node generate-machine-config.js 7
# Output: machine-configs/machine-7-config.json created with all slots
```

### Step 2b: Sync to Cloud
```bash
node sync-machine-to-cloud.js machine-configs/machine-7-config.json
# Browser automation updates all slots (2-5 minutes)
# Check screenshots/ for visual verification
```

### Step 3: Validate
```bash
# 1. Export slot CSV from Ourvend web interface
# 2. Place in csv-validations/
# 3. Run comparison:
node compare-config-with-csv.js
# Output: Validation report
```

---

## 🚨 Troubleshooting

### "Machine ID X not found"
**Solution:** Check machine exists in database:
```sql
SELECT * FROM machine WHERE id = X
```

### "Product not found in dropdown" during sync
**Cause:** Product name mismatch between DB and Ourvend
**Solution:**
1. Check exact product name in Ourvend
2. Update database to match exactly
3. Or add product via Excel import first

### "Slot X not found" during sync
**Cause:** Slot doesn't exist in Ourvend
**Solution:** Verify slot numbers in Ourvend web interface

### Validation shows mismatches
**Cause:** Sync failed or CSV export is stale
**Solution:**
1. Re-export fresh CSV from Ourvend
2. Re-run sync if needed
3. Check screenshots/ for failed operations

---

## 📚 Additional Documentation

- **[SYNC-WORKFLOW.md](docs/SYNC-WORKFLOW.md)** - Detailed sync workflow
- **[DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md)** - Database structure
- **[CLAUDE.md](CLAUDE.md)** - Project context for AI assistants

---

## 🔮 Future Enhancements

1. **Batch sync script** - Sync multiple machines in one command
2. **Diff checking** - Only sync changed slots
3. **Automated scheduling** - Cron jobs for daily syncs
4. **Validation automation** - Auto-download CSV for validation
