# Slot Update Script Documentation

## Overview
The `update-slot-from-config.js` script automates the process of updating vending machine slot configurations through the Ourvend web interface. It reads slot configurations from a JSON file and updates product assignments and prices for multiple slots in a single run.

## Prerequisites
- Node.js installed
- Dependencies installed (`npm install`)
- Valid Ourvend credentials (stored in environment or login module)

## Usage

### 1. Configure Machines and Slots
Edit `slot-configurations.json` with your machines and their slot configurations:

```json
[
  {
    "machineGrouping": "1050",
    "machineId": "Cips (5) 250306",
    "slots": [
      {
        "slotNumber": 1,
        "productName": "Red Bull Energy Drink",
        "machinePrice": 3.5,
        "userDefinedPrice": 3.5,
        "capacity": 199,
        "existing": 199,
        "weChatDiscount": 100,
        "alipayDiscount": 100,
        "idCardDiscount": 100,
        "alertingQuantity": ""
      }
    ]
  },
  {
    "machineGrouping": "1050",
    "machineId": "Slatkisi (5) 2503050187",
    "slots": [...]
  }
]
```

### 2. Run the Script
```bash
cd /mnt/e/repos/tcn-spaeti
node update-slot-from-config.js
```

### 3. What the Script Does
1. Logs into Ourvend automatically
2. For each machine in the configuration:
   - Navigates to Slot Management
   - Selects the machine using machineGrouping and machineId
   - For each slot in that machine:
     - Finds the slot by "Slot numberX" text
     - Opens the edit modal
     - Changes the product (if different)
     - Updates Machine Price and User-defined Price
     - Saves changes
     - Handles success confirmation
   - Provides a summary for that machine
3. Provides an overall summary of all machines and slots

## Configuration Fields

### Machine Level
- **machineGrouping**: The machine group (e.g., "1050")
- **machineId**: The specific machine identifier (e.g., "Cips (5) 250306")
- **slots**: Array of slot configurations for this machine

### Slot Level
- **slotNumber**: The slot number to update (e.g., 1, 3, 5)
- **productName**: Product name to assign to the slot
- **machinePrice**: Price displayed on the machine (#SiPrice field)
- **userDefinedPrice**: Custom price setting (#SiCustomPrice field)
- **capacity**: Slot capacity (not currently updated)
- **existing**: Existing inventory (not currently updated)
- **weChatDiscount**: WeChat payment discount (not currently updated)
- **alipayDiscount**: Alipay payment discount (not currently updated)
- **idCardDiscount**: ID card payment discount (not currently updated)
- **alertingQuantity**: Alert threshold (not currently updated)

## Currently Implemented Fields
✅ Product selection (productName)
✅ Machine Price (machinePrice)
✅ User-defined Price (userDefinedPrice)

## Expected Output
```
=== SLOT UPDATE CONFIGURATION ===
Total machines to process: 2
  - Cips (5) 250306: 3 slots
  - Slatkisi (5) 2503050187: 3 slots
Total slots to update: 6

======================================================================
PROCESSING MACHINE: Cips (5) 250306
Machine Grouping: 1050
Slots to update: 1, 3, 5
======================================================================

=== SETTING UP BROWSER AND NAVIGATION ===
✓ Logged in successfully
✓ In slot management iframe
✓ Query executed
✓ Browser ready, machine selected

Processing Slot 1: Red Bull Energy Drink
✓ Successfully updated Slot 1

--- Machine Cips (5) 250306 Summary ---
✓ Successfully updated: 3 slots
  Slots: 1, 3, 5
❌ Failed: 0 slots

======================================================================
PROCESSING MACHINE: Slatkisi (5) 2503050187
Machine Grouping: 1050
Slots to update: 1, 2, 3
======================================================================

=== SETTING UP BROWSER AND NAVIGATION ===
✓ Browser ready, machine selected

Processing Slot 1: Velo Breezy Mango Original Slim
✓ Successfully updated Slot 1

--- Machine Slatkisi (5) 2503050187 Summary ---
✓ Successfully updated: 3 slots
  Slots: 1, 2, 3
❌ Failed: 0 slots

======================================================================
OVERALL SUMMARY
======================================================================
Total machines processed: 2
✓ Total slots successfully updated: 6
❌ Total slots failed: 0

By Machine:
  Cips (5) 250306: 3 successful, 0 failed
  Slatkisi (5) 2503050187: 3 successful, 0 failed
```

## Error Handling
- Non-existent slots are logged as failures but don't stop the script
- Network errors will cause the script to exit
- Login failures will prevent the script from running

## Multiple Machine Support
The script now supports updating multiple machines in a single run. Each machine:
- Gets its own browser session and login
- Is selected using its machineGrouping and machineId
- Processes all configured slots
- Reports success/failure per machine
- Continues to next machine even if current machine fails

## Troubleshooting
1. **Script can't find slots**: Ensure the slot numbers exist in the selected machine
2. **Product not changing**: Check that the product name exactly matches what's in the dropdown
3. **Prices not updating**: The script currently only updates #SiPrice and #SiCustomPrice fields
4. **Login fails**: Check credentials in the login module

## Notes
- The product dropdown may visually show "1050" (machine grouping) instead of the product name due to Bootstrap Select behavior, but the product is correctly selected
- Wait times have been optimized for performance (1-3 seconds between actions)
- Screenshots are saved in the `screenshots/` directory for debugging