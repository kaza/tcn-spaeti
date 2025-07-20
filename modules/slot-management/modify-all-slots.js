const { chromium } = require('playwright');
const { login } = require('../common/login');

const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

async function modifyAllSlots() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await login(page);
    
    console.log('\n=== NAVIGATING TO SLOT MANAGEMENT ===');
    
    // Navigate to slot management
    await page.evaluate(() => {
      const vendingMgmt = Array.from(document.querySelectorAll('span')).find(el => 
        el.textContent?.includes('Vending machine management')
      );
      if (vendingMgmt) {
        vendingMgmt.click();
        if (vendingMgmt.parentElement) vendingMgmt.parentElement.click();
      }
    });
    
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const slotLink = Array.from(document.querySelectorAll('a')).find(link => 
        link.getAttribute('onclick')?.includes('SetMenuLinkUrl(43')
      );
      if (slotLink) slotLink.click();
    });
    
    await page.waitForTimeout(5000);
    
    const slotFrame = page.frames().find(frame => 
      frame.url().includes('Selection/Index')
    );
    
    if (!slotFrame) {
      throw new Error('Could not find slot management iframe');
    }
    
    console.log('✓ In slot management iframe');
    
    // Select machine using working method
    console.log('\n=== SELECTING MACHINE ===');
    
    // Click first dropdown and select Default Unit2
    await slotFrame.evaluate(() => {
      const firstButton = document.querySelector('button.dropdown-toggle');
      if (firstButton) firstButton.click();
    });
    await slotFrame.waitForTimeout(1000);
    
    await slotFrame.evaluate(() => {
      const items = document.querySelectorAll('.dropdown-menu.open li a');
      for (const item of items) {
        if (item.textContent.includes('Default Unit2')) {
          item.click();
          break;
        }
      }
    });
    await slotFrame.waitForTimeout(1000);
    
    // Click second dropdown and select Slatko machine
    await slotFrame.evaluate(() => {
      const buttons = document.querySelectorAll('button.dropdown-toggle');
      if (buttons[1]) buttons[1].click();
    });
    await slotFrame.waitForTimeout(1000);
    
    await slotFrame.evaluate(() => {
      const items = document.querySelectorAll('.dropdown-menu.open li a');
      for (const item of items) {
        if (item.textContent.includes('Slatko')) {
          item.click();
          break;
        }
      }
    });
    await slotFrame.waitForTimeout(1000);
    
    // Click Query
    await slotFrame.evaluate(() => {
      const queryBtn = document.querySelector('a[onclick="Search()"]');
      if (queryBtn) queryBtn.click();
    });
    
    console.log('✓ Query executed');
    await slotFrame.waitForTimeout(5000);
    
    // Get all Edit buttons
    const editButtonCount = await slotFrame.evaluate(() => {
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      return editButtons.length;
    });
    
    console.log(`\n=== FOUND ${editButtonCount} SLOTS TO MODIFY ===`);
    
    // Process each slot
    for (let i = 0; i < Math.min(editButtonCount, 10); i++) { // Limit to first 10 for testing
      console.log(`\n--- Processing slot ${i + 1} ---`);
      
      // Click Edit button
      const editClicked = await slotFrame.evaluate((index) => {
        const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
          btn.textContent?.trim() === 'Edit'
        );
        
        if (editButtons[index]) {
          editButtons[index].click();
          return true;
        }
        return false;
      }, i);
      
      if (!editClicked) {
        console.log(`❌ Could not click Edit for slot ${i + 1}`);
        continue;
      }
      
      // Wait for modal
      await slotFrame.waitForTimeout(2000);
      
      // Try to modify the slot
      const modifyResult = await slotFrame.evaluate((slotIndex) => {
        const result = {
          success: false,
          priceSet: false,
          productChanged: false,
          saveClicked: false,
          details: {}
        };
        
        // Find the visible modal
        const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (!modal) {
          result.details.error = 'No modal found';
          return result;
        }
        
        // Try to set price - look for all number inputs that might be price
        const allInputs = modal.querySelectorAll('input[type="text"], input[type="number"]');
        let priceInput = null;
        
        // First try specific price selectors
        priceInput = modal.querySelector('input[name*="price"], input[name*="Price"], input[placeholder*="price"], input[placeholder*="Price"]');
        
        // If not found, look for inputs with labels containing price
        if (!priceInput) {
          allInputs.forEach(input => {
            const label = input.parentElement?.textContent || '';
            if (label.toLowerCase().includes('price') || label.includes('价格')) {
              priceInput = input;
            }
          });
        }
        
        // If still not found, try the first numeric input that's not quantity
        if (!priceInput) {
          priceInput = Array.from(allInputs).find(input => 
            input.type === 'number' && 
            !input.name?.toLowerCase().includes('quantity') &&
            !input.name?.toLowerCase().includes('capacity')
          );
        }
        
        if (priceInput) {
          const newPrice = 10.50 + (slotIndex * 0.50); // Different price for each slot
          priceInput.value = newPrice.toFixed(2);
          priceInput.dispatchEvent(new Event('input', { bubbles: true }));
          priceInput.dispatchEvent(new Event('change', { bubbles: true }));
          result.priceSet = true;
          result.details.price = newPrice.toFixed(2);
          result.details.priceFieldInfo = {
            type: priceInput.type,
            name: priceInput.name,
            id: priceInput.id,
            placeholder: priceInput.placeholder
          };
        }
        
        // Try to change product (if dropdown exists)
        const productSelect = modal.querySelector('select[name*="product"], select[name*="commodity"], select[id*="product"], select[id*="commodity"]');
        if (productSelect && productSelect.options.length > 1) {
          // Select a different product based on slot index
          const targetIndex = (slotIndex % (productSelect.options.length - 1)) + 1;
          productSelect.selectedIndex = targetIndex;
          productSelect.value = productSelect.options[targetIndex].value;
          productSelect.dispatchEvent(new Event('change', { bubbles: true }));
          result.productChanged = true;
          result.details.product = productSelect.options[targetIndex].text;
        }
        
        // Set quantity/capacity if available
        const quantityInputs = modal.querySelectorAll('input[name*="quantity"], input[name*="Quantity"], input[name*="capacity"], input[name*="Capacity"], input[type="number"]:not([name*="price"])');
        if (quantityInputs.length > 0) {
          const quantityInput = quantityInputs[0];
          quantityInput.value = '10'; // Set capacity to 10
          quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
          quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
          result.details.quantity = '10';
        }
        
        // Try to save - look for save/submit/confirm buttons
        const saveButtons = Array.from(modal.querySelectorAll('button, input[type="submit"], a.btn')).filter(btn => {
          const text = (btn.textContent || btn.value || '').toLowerCase();
          return text.includes('save') || text.includes('submit') || text.includes('confirm') || 
                 text.includes('ok') || text.includes('update') || text.includes('保存');
        });
        
        if (saveButtons.length > 0) {
          saveButtons[0].click();
          result.saveClicked = true;
          result.details.saveButton = saveButtons[0].textContent || saveButtons[0].value;
        } else {
          // Try to close modal with any button that might save
          const allButtons = Array.from(modal.querySelectorAll('button'));
          if (allButtons.length > 0) {
            // Click the last button (often the primary action)
            allButtons[allButtons.length - 1].click();
            result.saveClicked = true;
            result.details.saveButton = 'Last button clicked';
          }
        }
        
        result.success = result.priceSet || result.productChanged;
        return result;
      }, i);
      
      console.log(`Slot ${i + 1} result:`, modifyResult);
      
      // Wait for success message and close it
      await slotFrame.waitForTimeout(2000);
      
      // Handle success confirmation modal
      const confirmationClosed = await slotFrame.evaluate(() => {
        // Look for the success modal with "Edited successfully" message
        const modals = Array.from(document.querySelectorAll('.modal, [class*="modal"]'));
        
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            const modalText = modal.textContent || '';
            
            // Check if this is the success confirmation modal
            if (modalText.includes('Edited successfully') || modalText.includes('Success')) {
              // Find the Close button with data-dismiss="modal"
              const closeButton = modal.querySelector('button[data-dismiss="modal"]');
              if (closeButton) {
                console.log('Found success confirmation, clicking Close');
                closeButton.click();
                return true;
              }
              
              // Alternative: find button with "Close" text
              const closeButtons = Array.from(modal.querySelectorAll('button')).filter(btn => 
                btn.textContent.trim() === 'Close'
              );
              if (closeButtons.length > 0) {
                closeButtons[0].click();
                return true;
              }
            }
          }
        }
        return false;
      });
      
      if (confirmationClosed) {
        console.log('✓ Closed success confirmation');
      }
      
      // Wait for modal to fully close
      await slotFrame.waitForTimeout(1500);
      
      // Check if modal is still open and try to close it
      await slotFrame.evaluate(() => {
        const modals = document.querySelectorAll('.modal, [class*="modal"]');
        modals.forEach(modal => {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            // Try to find close button
            const closeButtons = modal.querySelectorAll('[data-dismiss="modal"], button.close, button[aria-label="Close"]');
            closeButtons.forEach(btn => btn.click());
          }
        });
      });
      
      await slotFrame.waitForTimeout(1000);
    }
    
    // After modifying slots, look for a global save button
    console.log('\n=== LOOKING FOR GLOBAL SAVE ===');
    
    const globalSaveResult = await slotFrame.evaluate(() => {
      // Look for save/submit buttons outside of modals
      const saveButtons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn')).filter(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        return text.includes('save') || text.includes('submit') || text.includes('apply') || 
               text.includes('update') || text.includes('保存');
      });
      
      if (saveButtons.length > 0) {
        saveButtons[0].click();
        return {
          found: true,
          buttonText: saveButtons[0].textContent || saveButtons[0].value
        };
      }
      
      return { found: false };
    });
    
    if (globalSaveResult.found) {
      console.log(`✓ Clicked global save button: "${globalSaveResult.buttonText}"`);
    } else {
      console.log('No global save button found');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: `screenshots/slots_modified_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Slot modification complete');
    console.log('Check the screenshot to see the results');
    console.log('Browser remains open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { modifyAllSlots };

// Run if called directly
if (require.main === module) {
  modifyAllSlots().catch(console.error);
}