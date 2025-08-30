# Slot Update Script Documentation

## Overview
The `update-slot-from-config.js` script automates the process of updating vending machine slot configurations through the Ourvend web interface. It reads slot configurations from a JSON file and updates product assignments and prices for multiple slots in a single run.

## Prerequisites
- Node.js installed
- Dependencies installed (`npm install`)
- Valid Ourvend credentials (stored in environment or login module)

## Usage

### 1. Configure Slots
Edit `slot-configurations.json` with your desired slot configurations:

```json
[
  {
    "slotNumber": 1,
    "productName": "Red Bull Energy Drink",
    "machinePrice": 3,
    "userDefinedPrice": 3,
    "capacity": 199,
    "existing": 199,
    "weChatDiscount": 100,
    "alipayDiscount": 100,
    "idCardDiscount": 100,
    "alertingQuantity": ""
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
2. Navigates to Slot Management
3. Selects the configured machine (default: 1050 / Cips (5) 250306)
4. For each slot in the configuration:
   - Finds the slot by "Slot numberX" text
   - Opens the edit modal
   - Changes the product (if different)
   - Updates Machine Price and User-defined Price
   - Saves changes
   - Handles success confirmation
5. Provides a summary of successful and failed updates

## Configuration Fields

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
Total slots to update: 5

=== SETTING UP BROWSER AND NAVIGATION ===
✓ Logged in successfully
✓ In slot management iframe
✓ Query executed
✓ Browser ready, machine selected

Processing Slot 1: Red Bull Energy Drink
✓ Opened Slot 1 for editing
✓ Changed product from "1050" to "Red Bull Energy Drink"
✓ All values are correct, clicking Close button
✓ Successfully updated Slot 1

============================================================
SUMMARY
============================================================
✓ Successfully updated: 3 slots
  Slots: 1, 3, 5
❌ Failed: 2 slots
  Slot 2: Could not find Slot number2
  Slot 4: Could not find Slot number4
```

## Error Handling
- Non-existent slots are logged as failures but don't stop the script
- Network errors will cause the script to exit
- Login failures will prevent the script from running

## Customization
To use a different machine, modify the `selectMachine` call in the script:
```javascript
await this.selectMachine('YourGrouping', 'Your Machine ID');
```

## Troubleshooting
1. **Script can't find slots**: Ensure the slot numbers exist in the selected machine
2. **Product not changing**: Check that the product name exactly matches what's in the dropdown
3. **Prices not updating**: The script currently only updates #SiPrice and #SiCustomPrice fields
4. **Login fails**: Check credentials in the login module

## Notes
- The product dropdown may visually show "1050" (machine grouping) instead of the product name due to Bootstrap Select behavior, but the product is correctly selected
- Wait times have been optimized for performance (1-3 seconds between actions)
- Screenshots are saved in the `screenshots/` directory for debugging