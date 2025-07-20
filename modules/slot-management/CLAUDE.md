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

### Expected URL Pattern
- Main page: https://os.ourvend.com/YSTemplet/index
- Possible iframe: https://os.ourvend.com/Selection/Index
- Iframe ID might be: `43` (based on SetMenuLinkUrl pattern)

## What We're Looking For
1. **Slot Grid/Layout**: Visual representation of vending machine slots
2. **Product Assignment**: Way to assign products to slots
3. **Capacity Settings**: Set max quantity per slot
4. **Price Override**: Possibly set different prices per slot
5. **Status Indicators**: Show which slots are empty/full

## Common Vending Machine Terms
- **Slot/Selection**: Physical position in machine
- **Channel**: Another term for slot
- **Coil/Spiral**: The mechanism that dispenses products
- **Planogram**: Layout diagram of products in machine

## Potential Challenges
- Might load in iframe like Commodity Management (id="43"?)
- Could have visual slot selector (grid/image)
- May require selecting machine first
- Might have drag-and-drop interface

## Next Steps
1. Navigate to slot management page ✓
2. Identify if it uses iframe
3. Explore the interface elements
4. Find how to assign products to slots
5. Test slot configuration