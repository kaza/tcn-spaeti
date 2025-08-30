# Slot Management Module - AI Assistant Documentation

## Purpose
This module handles slot management for vending machines - assigning products to specific slots/positions in the machine.

## Navigation Path
1. Click "Vending machine management" in left sidebar to expand submenu
2. Click "Slot management" submenu item
3. This triggers: `SetMenuLinkUrl(43, "Slot management", "/Selection/Index", false)`

## Key Information

### Navigation HTML
```html
<a href="#" onclick="SetMenuLinkUrl(43,&quot;Slot management&quot;,&quot;/Selection/Index&quot;,false)">
  <i class="fa fa-circle-o"></i>Slot management
</a>
```

### URL Pattern
- Main page: https://os.ourvend.com/YSTemplet/index
- Iframe URL: https://os.ourvend.com/Selection/Index
- Iframe ID: `43` (confirmed - matches SetMenuLinkUrl pattern)

## Critical Discoveries & Quirks

### 1. Bootstrap Select Dropdowns
- The page uses Bootstrap Select for dropdowns which are notoriously difficult to handle
- Standard select value setting doesn't work - must click the button and then the option
- Working method:
  ```javascript
  // Click the button
  const button = document.querySelector('button.dropdown-toggle');
  button.click();
  // Wait for dropdown to open
  await waitForTimeout(1000);
  // Click the option
  const items = document.querySelectorAll('.dropdown-menu.open li a');
  for (const item of items) {
    if (item.textContent.includes('Target Text')) {
      item.click();
      break;
    }
  }
  ```

### 2. Machine Selection Required
- Must select Group (e.g., "Default Unit2") first
- Then select Machine (e.g., "Slatko 2503050187")
- Machine dropdown only populates after group selection
- Query button (`onclick="Search()"`) loads the slot grid

### 3. Slot Grid Structure
- Each slot has "Edit" and "Clear" buttons
- Slots are displayed in a grid layout
- Found 98 slots for the test machine
- Each slot can be individually edited

### 4. Edit Modal Behavior
- Clicking "Edit" opens a modal for that specific slot
- After saving (Submit button), a success confirmation appears
- Success modal has "Edited successfully" message
- Must click Close button (`data-dismiss="modal"`) to dismiss confirmation
- Modal stacking can occur if not properly closed

### 5. Form Fields (Still being investigated)
- Product selection appears to be in top-right dropdown (per user feedback)
- Price field location not yet confirmed
- Quantity/capacity field expected but not yet mapped
- Submit button saves changes

## Working Scripts

### Navigation & Query
- `navigate-slot-management.js` - Basic navigation to slot management
- `query-slot-management.js` - Handles Bootstrap dropdowns and queries
- `bootstrap-select-handler.js` - Reliable Bootstrap Select handling (METHOD 3 works!)

### Slot Editing
- `edit-slot.js` - Basic slot editing exploration
- `edit-slot-product.js` - Product assignment attempts
- `edit-slot-complete.js` - Complete workflow with machine selection
- `modify-all-slots.js` - Bulk slot modification with success modal handling

### Analysis Tools
- `analyze-slot-form.js` - Deep analysis of edit form structure
- `query-by-boxid.js` - Alternative query method (not working as expected)

## Confirmed Working Flow

1. Navigate to slot management
2. Select machine grouping (e.g., "1050") from first dropdown
3. Select machine ID (e.g., "Cips (5) 250306") from second dropdown  
4. Click Query button
5. Find slot by searching for "Slot numberX" text
6. Click Edit button for the slot
7. Change product using Bootstrap Select dropdown
8. Update Machine Price (#SiPrice) and User-defined price (#SiCustomPrice)
9. Click Submit
10. Click Close on success confirmation ("Edited successfully")
11. Repeat for other slots

## Successfully Implemented Features

### Slot Finding Algorithm
- Searches for exact text "Slot numberX" in the page
- Handles non-existent slots gracefully
- Finds Edit button within the slot container

### Product Selection
- Uses Bootstrap Select dropdown (first dropdown in modal)
- Clicks dropdown button, waits, then clicks product option
- Note: Visual update may not reflect due to Bootstrap Select behavior

### Price Fields (Confirmed Working)
- **Machine Price**: `#SiPrice` 
- **User-defined Price**: `#SiCustomPrice`
- Both fields successfully update with new values

### Batch Processing
- Multi-machine support with independent browser sessions per machine
- Handles missing slots (e.g., slots 2, 4) without stopping
- Provides per-machine summaries and overall summary
- Continues to next machine even if current machine fails

## Working Scripts

### Main Implementation
- `update-slot-from-config.js` - Complete slot update system with multi-machine support
- `slot-configurations.json` - Configuration file with machines and their slot details

### Configuration Format (Multi-Machine Support)
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

### Multi-Machine Features
- Processes multiple machines in sequence
- Each machine gets its own browser session
- Automatic machine selection using grouping and ID
- Continues processing even if one machine fails
- Per-machine and overall summaries

## Known Issues & Workarounds

1. **Bootstrap Select**: Must use click simulation, not value setting
2. **Modal Stacking**: Always close success confirmations before proceeding
3. **Product Dropdown Display**: Shows machine grouping (e.g., "1050") instead of product name after selection
4. **Multiple Modals**: Page has many hidden modals - must find the visible one
5. **Slow Loading**: Reduced waits to 1-3 seconds for better performance

## Tested Configurations
- Machine Grouping: 1050
- Machine IDs tested:
  - Cips (5) 250306 - Working slots: 1, 3, 5
  - Slatkisi (5) 2503050187 - Working slots: 1, 2, 3
- Non-existent slots: handled gracefully

## AI Assistant Note
When running `update-slot-from-config.js` in the future, consider running it in background mode or with a longer timeout since processing multiple machines can take several minutes:
```bash
# Run with extended timeout
timeout 300 node update-slot-from-config.js

# Or run in background
nohup node update-slot-from-config.js > slot-update.log 2>&1 &
```