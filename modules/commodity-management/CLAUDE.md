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

## Image Upload & Save Process

### ⚠️ CRITICAL: Three-Step Submit Process
When saving a new commodity with an image:

1. **First Submit**: Click button with `id="cropsuccess"` to confirm image crop
2. **Second Submit**: Click button with `onclick="Edit_CMT()"` to save the commodity
3. **Third Submit**: Click button with `data-dismiss="modal"` to dismiss approval notification

All three buttons are labeled "Submit" but have different functions!

Note: After the third submit, you'll see a message that products take a few days to be approved.

### Required Image
- The system requires an image for each commodity
- Format: jpg, png
- Size limit: 15KB
- Background: White or transparent recommended
- If image is not approved, it won't display but product will still be listed

### Image Upload Field
- Input name: `WMPImg1`
- Located in the add commodity modal

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

### 4. Save Fails - "Please choose a commodity image"
**Problem**: System prompts for image selection
**Solution**: Must upload an image file. Use dummy4.jpg if actual image not needed.

### 5. Product Not Saved After Clicking Submit
**Problem**: Clicked submit but product doesn't appear in list
**Solution**: Make sure to click BOTH submit buttons in sequence:
1. Submit for crop confirmation (`id="cropsuccess"`)
2. Submit to save (`onclick="Edit_CMT()"`)

## Testing Tips
1. Run with `headless: false` to see what's happening
2. Use `slowMo: 1000` or higher to slow down actions
3. Take screenshots at each step for debugging
4. Check browser console for JavaScript errors

## Weird Things We Learned (IMPORTANT!)

### 1. The Iframe Mystery
The entire Commodity Info page loads inside an iframe! This was the biggest discovery:
- Main page: `https://os.ourvend.com/YSTemplet/index`
- Iframe ID: `54` (yes, just a number!)
- Iframe src: `https://os.ourvend.com/CommodityInfo/Index`
- You MUST switch to the iframe context or you won't find ANY elements

### 2. The Three Submit Button Dance
Adding a product requires clicking THREE different submit buttons in sequence:
1. **Crop Submit** (`id="cropsuccess"`) - Confirms the image crop
2. **Save Submit** (`onclick="Edit_CMT()"`) - Actually saves the commodity
3. **Popup Dismiss** (`data-dismiss="modal"`) - Dismisses the approval notification

All three buttons have the text "Submit" but do completely different things!

### 3. Multiple Popup Madness
After saving, multiple popups can appear:
- "Product needs approval" notification
- "Fill in the blanks" warning (if fields are missing)
- Success confirmation
- Sometimes they stack on top of each other!

### 4. Required Fields Not Marked
The form doesn't clearly indicate which fields are required. Through trial and error:
- Commodity code (barcode) - REQUIRED
- Product name - REQUIRED
- Specs - REQUIRED
- Unit price - REQUIRED
- Image - REQUIRED (system prompts if missing)
- Supplier dropdown - Must select an option
- Type dropdown - Must select an option

### 5. SetMenuLinkUrl Magic
Navigation uses a special JavaScript function:
```javascript
SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false)
```
The first parameter (54) matches the iframe ID!

### 6. Image Upload Quirks
- System requires an image for EVERY product
- Without image, you get "Please choose a commodity image" popup
- Image requirements: jpg/png, max 15KB
- Even dummy images work - they just won't display if not approved

### 7. Dropdown Default Selection
Dropdowns often have "--Please choose--" as first option which is NOT valid. Must select index 1 or higher.

### 8. Modal Within Modal Within Modal
The page can have 40+ modal divs, most hidden. When debugging, we found modals nested inside modals inside modals.

### 9. Chinese/English Mix
UI randomly switches between Chinese and English:
- "登录" = Login
- "保存" = Save
- "确定" = Confirm

### 10. Slow Page Loads
Everything loads slowly:
- Wait 5-7 seconds after navigation
- Wait 3 seconds after clicking buttons
- Modals animate in slowly

## Lessons Learned
1. Always check for iframes when elements aren't found
2. When one submit doesn't work, look for more submit buttons
3. Fill ALL fields even if they don't seem required
4. Upload an image even if it's just a dummy file
5. Be prepared to dismiss multiple popups
6. Use slowMo to see what's actually happening

## Future Enhancements
- Add validation for required fields
- Support for batch import
- Edit existing commodities
- Delete commodities
- Search and filter functionality
- Handle products without images