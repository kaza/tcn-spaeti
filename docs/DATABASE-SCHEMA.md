# Database Schema Documentation

## Overview
This document describes the Azure SQL Server database schema for the SpaetiToGo ERP system that syncs with the Ourvend vending machine platform.

**Database:** SpaetiToGo
**Server:** Azure SQL Server
**Last Updated:** 2025-10-07

## Core Tables

### 1. machine
**Purpose:** Stores vending machine information

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | int | NOT NULL | Primary key |
| remote_name | varchar(100) | NULL | Machine name in Ourvend |
| name | varchar(100) | NULL | Local machine name |
| remote_id | int | NULL | Machine ID in Ourvend system |
| serial | varchar(100) | NULL | Machine serial number |
| telemetry_unit_id | varchar(100) | NULL | Telemetry hardware ID |
| tcn_machine_group | varchar(100) | NULL | Machine grouping in Ourvend (e.g., "1050") |

**Example Data:**
```json
{
  "id": 7,
  "remote_name": "Cips (5) 2503060046",
  "name": "Cips (5) 2503060046",
  "remote_id": 3060046,
  "serial": "2503060046",
  "telemetry_unit_id": null,
  "tcn_machine_group": "1050"
}
```

**Key Fields for Ourvend Sync:**
- `tcn_machine_group` → Maps to Ourvend's **machineGrouping** dropdown
- `name` → Maps to Ourvend's **machineId** dropdown

---

### 2. product
**Purpose:** Stores product information

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key / Product barcode |
| name | varchar | Product name |
| sales_price | float | Selling price |
| purchase_price | float | Cost price |
| vat | float | Tax rate (VAT) |

**Used By:**
- Excel export scripts (`generate-product-import.js`)
- Slot configuration generation

---

### 3. machine_product
**Purpose:** Links products to specific machine slots (slot assignments)

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| machine_id | int | Foreign key to machine.id |
| product_id | int | Foreign key to product.id |
| position | varchar | Slot position (e.g., "001", "003", "005") |
| label | varchar | Slot label (e.g., "1", "3", "5") |
| price | float | Price for this product at this machine |
| remote_id | int | Slot remote ID in Ourvend |
| remote_name | varchar | Product name in Ourvend |

**Important Notes:**
- `position` field contains slot numbers as zero-padded strings ("001", "003", etc.)
- Not all positions are sequential (e.g., machine 7 has 001, 003, 005 but not 002, 004)
- `price` can override the default product price for specific machines
- Some slots may have `product_id = NULL` (empty slots)

**Example Query:**
```sql
SELECT
  mp.position,
  mp.label,
  mp.price,
  p.name AS product_name
FROM machine_product mp
LEFT JOIN product p ON mp.product_id = p.id
WHERE mp.machine_id = 7
  AND mp.product_id IS NOT NULL
ORDER BY CAST(mp.position AS INT)
```

---

### 4. product_placement
**Purpose:** Tracks product placement history and performance

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| product_id | int | Foreign key to product.id |
| start_date | datetime | Placement start date |
| end_date | datetime | Placement end date |
| price | float | Price during this placement |
| profit_margin | float | Profit margin percentage |
| items_sold | int | Number of items sold |
| slots_occupied | float | Number of slots occupied |

**Note:** This table does NOT have a `machine_id` column. It tracks product placement analytics across all machines.

---

### 5. receipt / receipt_item
**Purpose:** Sales transaction data

**receipt:**
- Transaction header information
- Date, total amount, payment method

**receipt_item:**
- Individual items in each transaction
- Links to products and machines

---

### 6. product_offer / product_image / product_tag / tag
**Purpose:** Product marketing and metadata

- `product_offer`: Special offers and promotions
- `product_image`: Product images for display
- `product_tag` / `tag`: Product categorization

---

### 7. sale
**Purpose:** Sales analytics and reporting

---

## Relationships

### Key Foreign Keys
```
machine_product.machine_id → machine.id
machine_product.product_id → product.id
product_placement.product_id → product.id
receipt_item.product_id → product.id
receipt_item.machine_id → machine.id (implied)
```

## Data Flow: Database → Ourvend

### Step 1: Query Machine Details
```sql
SELECT
  id,
  name,
  tcn_machine_group
FROM machine
WHERE id = 7
```

### Step 2: Query Slot Assignments
```sql
SELECT
  mp.position,
  mp.label,
  mp.price,
  p.name AS product_name,
  p.id AS product_id
FROM machine_product mp
LEFT JOIN product p ON mp.product_id = p.id
WHERE mp.machine_id = 7
  AND mp.product_id IS NOT NULL
ORDER BY CAST(mp.position AS INT)
```

### Step 3: Map to Ourvend Config
```javascript
{
  "machineGrouping": machine.tcn_machine_group,  // e.g., "1050"
  "machineId": machine.name,                     // e.g., "Cips (5) 2503060046"
  "slots": [
    {
      "slotNumber": parseInt(position),          // 1, 3, 5, ...
      "productName": product_name,
      "machinePrice": price,
      "userDefinedPrice": price
    }
  ]
}
```

## Scripts Using This Schema

### Reading from Database
- **generate-product-import.js** - Exports products to Excel
- **generate-machine-7-config.js** - Generates slot config from DB
- **query-machine-7.js** - Queries machine 7 details
- **explore-database.js** - Full database exploration

### Writing to Ourvend
- **update-slot-from-config.js** - Pushes slot configs to Ourvend web UI

## Notes for Future Development

1. **Slot Number Mapping:**
   - Database uses `position` as zero-padded strings ("001")
   - Ourvend UI uses `slotNumber` as integers (1)
   - Conversion: `parseInt(position)`

2. **Price Synchronization:**
   - Product table has default `sales_price`
   - machine_product table can override with slot-specific `price`
   - Always use machine_product.price if available

3. **Missing Data:**
   - Some machines lack `tcn_machine_group` (machines 1, 2, 3)
   - Empty slots have `product_id = NULL`
   - Handle gracefully in sync scripts

4. **Machine Count:**
   - Currently 7 machines (IDs: 1, 2, 3, 4, 6, 7, 8)
   - Note: ID 5 is missing (deleted or skipped)

5. **Slot Capacity:**
   - Default capacity values set to 199 in generated configs
   - Actual capacity tracking not currently in database schema
   - May need to add capacity column in future

## Connection Configuration

**Environment Variables (.env):**
```
SQL_USER=your_username
SQL_PASSWORD=your_password
SQL_SERVER=your_server.database.windows.net
SQL_DATABASE=SpaetiToGo
SQL_PORT=1433
```

**Connection Options:**
```javascript
{
  encrypt: true,
  trustServerCertificate: false,
  enableArithAbort: true,
  requestTimeout: 30000  // 30 seconds
}
```

## Machine ID Reference

| ID | Name | Machine Group | Remote ID | Serial |
|----|------|---------------|-----------|---------|
| 1 | AUT 1_Bier & Rauch | null | 393270 | VND000751311038 |
| 2 | AUT 2_Säfte & Süsses | null | 393271 | VND000751311062 |
| 3 | AUT 3_Bio & Chips | null | 393269 | 3417010499 |
| 4 | Hrana (19) 2503060049 | 1190 | 3060049 | 2503060049 |
| 6 | Slatkisi (4)- 2503060047 | 1040 | 3060047 | 2503060047 |
| 7 | Cips (5) 2503060046 | 1050 | 3060046 | 2503060046 |
| 8 | Slatkisi (5) 2503050187 | 1050 | 3050187 | 2503050187 |

**Note:** Only machines with `tcn_machine_group` set can be synced to Ourvend (machines 4, 6, 7, 8).
