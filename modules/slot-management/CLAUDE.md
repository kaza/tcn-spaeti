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
2. Select "Default Unit2" from first dropdown
3. Select "Slatko 2503050187" from second dropdown  
4. Click Query button
5. Click Edit on any slot
6. Modify fields in modal
7. Click Submit
8. Click Close on success confirmation
9. Repeat for other slots

## Known Issues & Workarounds

1. **Bootstrap Select**: Must use click simulation, not value setting
2. **Modal Stacking**: Always close success confirmations before proceeding
3. **Slow Loading**: Requires strategic waits after navigation and queries
4. **Chinese/English Mix**: UI has mixed languages
5. **Field Discovery**: Still mapping exact field selectors for price/product

## Next Steps
1. Complete field mapping in edit modal ✓ (partially)
2. Identify product dropdown in "top right" as mentioned by user
3. Implement reliable product selection
4. Test bulk updates with actual products
5. Create production-ready scripts for ERP integration