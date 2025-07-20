# Commodity Management Module - AI Assistant Documentation

## Purpose
This module handles all commodity/product related operations in the Ourvend system.

## Critical Information

### Page Structure
⚠️ **IMPORTANT**: The Commodity Info page loads in an **iframe**!
- Main page URL: https://os.ourvend.com/YSTemplet/index
- Iframe ID: `54`
- Iframe URL: https://os.ourvend.com/CommodityInfo/Index

### Navigation Path
1. Click "Commodity management" in left sidebar (it's a `<span>` element)
2. Call `SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false)`
3. Wait for iframe to load (5-7 seconds)

### Add Button
- Located inside the iframe (NOT the main page)
- HTML: `<a href="#" class="btn btn-success" onclick="Modal_User('Add')"><span class="glyphicon glyphicon-plus"></span>Add</a>`
- Opens a modal dialog for adding new commodity

## Form Fields
When adding a new commodity, these fields are available:
- **Commodity code** (barcode) - Required
- **Product name** - Required
- **Specs** (specification) - Required
- **Unit price** - Required
- **Supplier** - Dropdown (select first option)
- **Type** - Dropdown (select first option)
- **Cost price** - Optional
- **Expiration date** - Optional
- **Is it an NFC product** - Checkbox
- **Description** - Text area

## Code Example
```javascript
const { addCommodity } = require('./add-commodity');

// Add with default values
const result = await addCommodity();

// Add with custom values
const result = await addCommodity({
  code: '123456789',
  name: 'Coca Cola 500ml',
  specs: '500ml bottle',
  unitPrice: '3.50',
  costPrice: '2.00'
});
```

## Common Issues & Solutions

### 1. Add Button Not Found
**Problem**: Script can't find the Add button
**Solution**: The button is inside an iframe. Must switch to iframe context first.

### 2. Form Doesn't Appear
**Problem**: Clicking Add doesn't open the form
**Solution**: Wait longer after click (3+ seconds). The modal loads slowly.

### 3. Navigation Fails
**Problem**: Commodity management menu doesn't expand
**Solution**: Click both the span and its parent element. Sometimes needs double-click.

## Testing Tips
1. Run with `headless: false` to see what's happening
2. Use `slowMo: 1000` or higher to slow down actions
3. Take screenshots at each step for debugging
4. Check browser console for JavaScript errors

## Future Enhancements
- Add validation for required fields
- Support for image upload
- Batch commodity import
- Edit existing commodities
- Delete commodities
- Search and filter functionality