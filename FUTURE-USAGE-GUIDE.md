# Future Usage Guide - Machine Sync System

## Quick Reference Card

```bash
# Generate config from database for any machine
node generate-machine-config.js <machine_id>

# Sync that machine to Ourvend cloud
node sync-machine-to-cloud.js machine-<machine_id>-config.json
```

**That's it! Two commands to sync any machine.**

---

## Common Use Cases

### Use Case 1: Daily Price Updates

**Scenario:** You updated prices in your ERP database and need to sync to vending machines.

```bash
# 1. Update prices in SpaetiToGo database first
# (via your ERP system or direct SQL update)

# 2. Regenerate config from database
node generate-machine-config.js 7

# 3. Sync to cloud
node sync-machine-to-cloud.js machine-7-config.json

# Result: Machine 7 now has updated prices in Ourvend
```

**How often:** As needed when prices change (daily, weekly, etc.)

---

### Use Case 2: Product Assortment Changes

**Scenario:** You're changing which products are in which slots.

```bash
# 1. Update machine_product table in database
UPDATE machine_product
SET product_id = 123
WHERE machine_id = 7 AND position = '005'

# 2. Regenerate config
node generate-machine-config.js 7

# 3. Review changes before syncing
cat machine-7-config.json | grep "slotNumber\": 5" -A 10

# 4. Sync to cloud
node sync-machine-to-cloud.js machine-7-config.json
```

---

### Use Case 3: New Machine Setup

**Scenario:** You added a new vending machine to your fleet.

```bash
# 1. Add machine to database
INSERT INTO machine (name, tcn_machine_group, serial, remote_id)
VALUES ('New Machine (6) 2503060050', '1050', '2503060050', 3060050)

# Get the new machine ID (let's say it's 9)

# 2. Add products to slots
INSERT INTO machine_product (machine_id, product_id, position, price)
VALUES (9, 898, '001', 3.80),
       (9, 900, '003', 3.00),
       ...

# 3. Generate config
node generate-machine-config.js 9

# 4. Verify config looks good
cat machine-9-config.json

# 5. Sync to cloud
node sync-machine-to-cloud.js machine-9-config.json
```

---

### Use Case 4: Bulk Sync Multiple Machines

**Scenario:** You made changes across multiple machines and need to sync all of them.

**Option A - Shell script (create this file):**

Create `sync-all-machines.sh`:
```bash
#!/bin/bash
# Sync multiple machines

MACHINES=(6 7 8)  # Add your machine IDs here

for machine_id in "${MACHINES[@]}"; do
    echo "================================"
    echo "Processing Machine $machine_id"
    echo "================================"

    # Generate config
    node generate-machine-config.js $machine_id

    if [ $? -eq 0 ]; then
        # Sync to cloud
        node sync-machine-to-cloud.js machine-${machine_id}-config.json
    else
        echo "Failed to generate config for machine $machine_id"
    fi

    echo ""
done

echo "All machines processed!"
```

**Usage:**
```bash
chmod +x sync-all-machines.sh
./sync-all-machines.sh
```

**Option B - Manual one by one:**
```bash
# Machine 6
node generate-machine-config.js 6 && \
node sync-machine-to-cloud.js machine-6-config.json

# Machine 7
node generate-machine-config.js 7 && \
node sync-machine-to-cloud.js machine-7-config.json

# Machine 8
node generate-machine-config.js 8 && \
node sync-machine-to-cloud.js machine-8-config.json
```

---

### Use Case 5: Verify Before Syncing

**Scenario:** You want to check what will be synced before actually doing it.

```bash
# 1. Generate config
node generate-machine-config.js 7

# 2. Check the summary
cat machine-7-config.json | head -20

# 3. Count how many slots will be updated
cat machine-7-config.json | grep "slotNumber" | wc -l

# 4. Check specific slot
cat machine-7-config.json | jq '.slots[] | select(.slotNumber == 1)'

# 5. If everything looks good, sync
node sync-machine-to-cloud.js machine-7-config.json
```

---

### Use Case 6: Emergency Price Rollback

**Scenario:** You synced wrong prices and need to roll back.

```bash
# Option A: Restore from backup config
cp machine-7-config-backup.json machine-7-config.json
node sync-machine-to-cloud.js machine-7-config.json

# Option B: Regenerate from database (if DB is correct)
node generate-machine-config.js 7
node sync-machine-to-cloud.js machine-7-config.json

# Option C: Manually edit config and sync
nano machine-7-config.json  # Edit prices
node sync-machine-to-cloud.js machine-7-config.json
```

**Best Practice:** Always backup configs before syncing:
```bash
cp machine-7-config.json machine-7-config-backup-$(date +%Y%m%d).json
node sync-machine-to-cloud.js machine-7-config.json
```

---

## Scheduled Automation

### Daily Automated Sync (Cron Job)

**Setup:**
```bash
crontab -e
```

**Add this line for daily sync at 6 AM:**
```cron
0 6 * * * cd /mnt/e/repos/tcn-spaeti && node generate-machine-config.js 7 && node sync-machine-to-cloud.js machine-7-config.json >> logs/sync-machine-7.log 2>&1
```

**Multiple machines:**
```cron
# Machine 6 at 6:00 AM
0 6 * * * cd /mnt/e/repos/tcn-spaeti && node generate-machine-config.js 6 && node sync-machine-to-cloud.js machine-6-config.json >> logs/sync-machine-6.log 2>&1

# Machine 7 at 6:10 AM
10 6 * * * cd /mnt/e/repos/tcn-spaeti && node generate-machine-config.js 7 && node sync-machine-to-cloud.js machine-7-config.json >> logs/sync-machine-7.log 2>&1

# Machine 8 at 6:20 AM
20 6 * * * cd /mnt/e/repos/tcn-spaeti && node generate-machine-config.js 8 && node sync-machine-to-cloud.js machine-8-config.json >> logs/sync-machine-8.log 2>&1
```

**Create logs directory:**
```bash
mkdir -p logs
```

---

## Maintenance Tasks

### Weekly: Review Sync Logs

```bash
# Check recent syncs
ls -lth machine-*-config.json

# Check if any machines haven't synced recently
find . -name "machine-*-config.json" -mtime +7

# Review logs (if you set up logging)
tail -100 logs/sync-machine-7.log
```

---

### Monthly: Verify Database Consistency

```bash
# Check for machines without machine grouping
node -e "
const sql = require('mssql');
require('dotenv').config();
sql.connect({
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true }
}).then(pool => {
  return pool.request().query('SELECT id, name, tcn_machine_group FROM machine WHERE tcn_machine_group IS NULL');
}).then(result => {
  console.log('Machines without grouping:', result.recordset);
  process.exit(0);
});
"
```

---

### Quarterly: Full Audit

```bash
# Generate configs for all machines
for id in 6 7 8; do
    node generate-machine-config.js $id
done

# Compare with Ourvend manually
# Check for discrepancies
```

---

## Troubleshooting Guide

### Problem: Config generation fails

**Error:** "Machine ID X not found"

**Solution:**
```bash
# Check if machine exists
node query-machine-7.js  # Or use database query tool

# If missing, add to database first
```

---

### Problem: Sync fails on specific slots

**Error:** "Slot X not found"

**Solution:**
```bash
# Option 1: Remove that slot from config
nano machine-7-config.json  # Remove the problematic slot

# Option 2: Check Ourvend manually
# Log into Ourvend web interface and verify slot exists

# Option 3: Check slot numbering
# Database position might not match Ourvend slot number
```

---

### Problem: Product name doesn't match

**Error:** "Could not find product: XYZ"

**Solution:**
```sql
-- Update product name in database to match Ourvend exactly
UPDATE product
SET name = 'Exact Name From Ourvend'
WHERE id = 123;

-- Then regenerate config
node generate-machine-config.js 7
```

---

### Problem: Browser automation crashes

**Solution:**
```bash
# Try with slower automation
# Edit sync-machine-to-cloud.js temporarily:
# Change slowMo: 1000 to slowMo: 2000

# Or run in non-headless mode to see what's happening
# (it already runs in non-headless by default)
```

---

## Best Practices

### 1. Always Regenerate from Database
```bash
# DON'T manually edit configs for permanent changes
# DO update database and regenerate

# Manual edits are only for quick fixes or testing
```

### 2. Backup Before Major Changes
```bash
# Before syncing multiple machines
for id in 6 7 8; do
    cp machine-${id}-config.json backups/machine-${id}-config-$(date +%Y%m%d).json
done
```

### 3. Test on One Machine First
```bash
# When making major changes, test on one machine first
node generate-machine-config.js 6  # Test machine
node sync-machine-to-cloud.js machine-6-config.json

# If successful, proceed with others
```

### 4. Version Control Your Configs
```bash
# Commit configs after successful syncs
git add machine-*-config.json
git commit -m "Update machine configs $(date +%Y-%m-%d)"
git push
```

### 5. Monitor Sync Success
```bash
# Add to your sync scripts
if [ $? -eq 0 ]; then
    echo "$(date): Machine 7 sync SUCCESS" >> logs/sync-history.log
else
    echo "$(date): Machine 7 sync FAILED" >> logs/sync-history.log
    # Send alert email or notification
fi
```

---

## File Organization

### Keep Your Workspace Clean

```bash
tcn-spaeti/
├── machine-6-config.json        # Active configs
├── machine-7-config.json
├── machine-8-config.json
├── backups/                     # Config backups
│   ├── machine-7-config-20251007.json
│   └── machine-7-config-20251006.json
├── logs/                        # Sync logs
│   ├── sync-machine-7.log
│   └── sync-history.log
└── screenshots/                 # Automation screenshots
    └── slot_1_after_validation_*.png
```

---

## Quick Command Reference

```bash
# List all available machines
node -e "require('mssql').connect({user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,server:process.env.SQL_SERVER,database:process.env.SQL_DATABASE,options:{encrypt:true}}).then(p=>p.request().query('SELECT id,name,tcn_machine_group FROM machine ORDER BY id')).then(r=>{console.log(r.recordset);process.exit(0)})"

# Generate config for machine
node generate-machine-config.js <ID>

# Sync to cloud
node sync-machine-to-cloud.js machine-<ID>-config.json

# Query specific machine details
node query-machine-7.js

# Explore database schema
node explore-database.js

# Backup config
cp machine-7-config.json backups/machine-7-config-$(date +%Y%m%d).json

# View config summary
cat machine-7-config.json | jq '.machineId, .machineName, .slots | length'

# Check specific slot
cat machine-7-config.json | jq '.slots[] | select(.slotNumber == 1)'
```

---

## Support & Documentation

- **[SYNC-WORKFLOW.md](SYNC-WORKFLOW.md)** - Detailed workflow steps
- **[DATABASE-SCHEMA.md](DATABASE-SCHEMA.md)** - Database structure
- **[CLAUDE.md](CLAUDE.md)** - Project overview

---

## When Things Change

### If Ourvend Changes Their Interface

1. Update `sync-machine-to-cloud.js`
2. Check for new field IDs or class names
3. Test on one machine before bulk updates
4. Update this documentation

### If Database Schema Changes

1. Update `generate-machine-config.js` queries
2. Update `DATABASE-SCHEMA.md`
3. Test config generation
4. Regenerate all configs

### If You Add New Machines

1. Add to database with `tcn_machine_group` set
2. Add products to `machine_product` table
3. Generate config: `node generate-machine-config.js <ID>`
4. Sync: `node sync-machine-to-cloud.js machine-<ID>-config.json`
5. Add to bulk sync scripts if using automation

---

## Remember

✅ **Database is the source of truth**
✅ **Configs are generated, not edited**
✅ **Always backup before bulk operations**
✅ **Test on one machine first**
✅ **Monitor and log sync operations**

---

**Last Updated:** 2025-10-07
