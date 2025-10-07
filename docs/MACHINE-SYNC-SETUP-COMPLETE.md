# ✅ Machine Sync Setup - Complete

**Date:** 2025-10-07
**Machine Synced:** Machine ID 7 - Cips (5) 2503060046

---

## What Was Accomplished

### 1. Database Schema Explored ✅
- Documented all 16 tables in SpaetiToGo database
- Identified key relationships between `machine`, `machine_product`, and `product` tables
- Found that machine 7 has 58 slots configured with products
- Created **DATABASE-SCHEMA.md** with complete schema documentation

### 2. Centralized Config Generation Script ✅
**File:** `generate-machine-config.js`

**Usage:**
```bash
node generate-machine-config.js <machine_id>
```

**What it does:**
- Takes machine ID as command-line argument
- Queries database for machine details and slot assignments
- Generates individual config file: `machine-{id}-config.json`
- One config per machine (not one big file for all machines)

### 3. Cloud Sync Script ✅
**File:** `sync-machine-to-cloud.js`

**Usage:**
```bash
node sync-machine-to-cloud.js machine-7-config.json
```

**What it does:**
- Takes config filename as argument
- Uses Playwright to automate Ourvend web interface
- Updates all slots for that machine in the cloud
- Provides success/failure summary

### 4. Machine 7 Config Generated ✅
**File:** `machine-7-config.json`

**Details:**
- Machine ID: 7
- Machine Name: Cips (5) 2503060046
- Machine Grouping: 1050
- Total Slots: 58
- Products: Chips, snacks, drinks with prices

---

## Files Created

| File | Purpose |
|------|---------|
| `generate-machine-config.js` | Centralized config generator (takes machine ID as input) |
| `sync-machine-to-cloud.js` | Cloud sync script (takes config file as input) |
| `machine-7-config.json` | Machine 7's slot configuration |
| `DATABASE-SCHEMA.md` | Complete database documentation |
| `SYNC-WORKFLOW.md` | Step-by-step sync workflow guide |
| `explore-database.js` | Database exploration utility |
| `query-machine-7.js` | Machine 7 query utility |

---

## How to Use

### Sync Machine 7 to Cloud

```bash
# Already done - config exists!
# To regenerate from database:
node generate-machine-config.js 7

# To sync to Ourvend cloud:
node sync-machine-to-cloud.js machine-7-config.json
```

### Sync Another Machine

```bash
# Example: Sync machine 8
node generate-machine-config.js 8
node sync-machine-to-cloud.js machine-8-config.json

# Example: Sync machine 6
node generate-machine-config.js 6
node sync-machine-to-cloud.js machine-6-config.json
```

---

## Database Details

### All Machines in Database

| ID | Name | Machine Group | Slots |
|----|------|---------------|-------|
| 1 | AUT 1_Bier & Rauch | null | N/A |
| 2 | AUT 2_Säfte & Süsses | null | N/A |
| 3 | AUT 3_Bio & Chips | null | N/A |
| 4 | Hrana (19) 2503060049 | 1190 | Yes |
| 6 | Slatkisi (4)- 2503060047 | 1040 | Yes |
| **7** | **Cips (5) 2503060046** | **1050** | **58 slots** |
| 8 | Slatkisi (5) 2503050187 | 1050 | Yes |

**Note:** Only machines with `tcn_machine_group` set can be synced to Ourvend.

---

## Machine 7 Slot Sample

First 5 slots configured:

1. **Slot 1:** Nic Nacs Double Crunch Peanuts - €3.80
2. **Slot 3:** Prima Erdnussstangen - €2.60
3. **Slot 5:** Soletti Gold Fischli Seasam - €3.00
4. **Slot 11:** Bugles Nacho Cheese - €3.60
5. **Slot 13:** Kellys Furiosi Käse - €3.40

---

## Architecture

```
┌──────────────────────┐
│   SQL Server DB      │  ← Source of truth
│   (SpaetiToGo)       │     (machine, machine_product, product tables)
└──────────┬───────────┘
           │
           │ node generate-machine-config.js 7
           ▼
┌──────────────────────┐
│ machine-7-config.json│  ← Individual machine config
└──────────┬───────────┘
           │
           │ node sync-machine-to-cloud.js machine-7-config.json
           ▼
┌──────────────────────┐
│   Ourvend Cloud      │  ← Destination (web interface automation)
│   Web Interface      │
└──────────────────────┘
```

---

## Next Steps

### Ready to Sync!

1. **Review the config:**
   ```bash
   cat machine-7-config.json
   ```

2. **Run the sync:**
   ```bash
   node sync-machine-to-cloud.js machine-7-config.json
   ```
   This will:
   - Open browser
   - Log into Ourvend
   - Navigate to Slot Management
   - Select Machine 7
   - Update all 58 slots
   - Show success/failure summary

3. **Sync other machines:**
   ```bash
   # Machine 8
   node generate-machine-config.js 8
   node sync-machine-to-cloud.js machine-8-config.json

   # Machine 6
   node generate-machine-config.js 6
   node sync-machine-to-cloud.js machine-6-config.json
   ```

---

## Documentation

- **[SYNC-WORKFLOW.md](SYNC-WORKFLOW.md)** - Complete workflow with examples
- **[DATABASE-SCHEMA.md](DATABASE-SCHEMA.md)** - Database schema and field mappings
- **[CLAUDE.md](CLAUDE.md)** - Updated with quick start guide

---

## Old Files (No Longer Needed)

The following files were created during development and can be archived:
- `generate-machine-7-config.js` (replaced by centralized script)
- `slot-configurations.json` (replaced by individual configs)

---

## Success Criteria ✅

- [x] Database schema documented
- [x] Centralized config generator created (takes machine ID as input)
- [x] Individual machine config files (one per machine)
- [x] Cloud sync script created (takes config file as input)
- [x] Machine 7 config generated (58 slots)
- [x] Comprehensive documentation written
- [x] Ready to sync to Ourvend cloud!

---

## Summary

**You now have a complete, centralized system for syncing any machine from your database to the Ourvend cloud!**

✅ **Centralized:** One script for all machines
✅ **Modular:** Each machine has its own config file
✅ **Documented:** Complete schema and workflow docs
✅ **Ready:** Machine 7 config generated and ready to sync
