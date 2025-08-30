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

async function editSlot() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await login(page);
    
    // Navigate to slot management
    console.log('\n=== QUICK NAVIGATION TO SLOT MANAGEMENT ===');
    
    // Quick navigation
    await page.evaluate(() => {
      // Click Vending machine management
      const vendingMgmt = Array.from(document.querySelectorAll('span')).find(el => 
        el.textContent?.includes('Vending machine management')
      );
      if (vendingMgmt) {
        vendingMgmt.click();
        if (vendingMgmt.parentElement) vendingMgmt.parentElement.click();
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Click Slot management
    await page.evaluate(() => {
      const slotLink = Array.from(document.querySelectorAll('a')).find(link => 
        link.getAttribute('onclick')?.includes('SetMenuLinkUrl(43')
      );
      if (slotLink) slotLink.click();
    });
    
    await page.waitForTimeout(5000);
    
    // Get the slot management iframe
    const slotFrame = page.frames().find(frame => 
      frame.url().includes('Selection/Index')
    );
    
    if (!slotFrame) {
      throw new Error('Could not find slot management iframe');
    }
    
    console.log('✓ In slot management iframe');
    
    // Quick query - select dropdowns and click query
    console.log('\n=== QUICK QUERY ===');
    
    // First dropdown
    await slotFrame.evaluate(() => {
      const firstButton = document.querySelector('button.dropdown-toggle');
      if (firstButton) firstButton.click();
    });
    await slotFrame.waitForTimeout(1000);
    
    await slotFrame.evaluate(() => {
      const defaultUnit2 = Array.from(document.querySelectorAll('.dropdown-menu.open li a'))
        .find(item => item.textContent?.includes('Default Unit2'));
      if (defaultUnit2) defaultUnit2.click();
    });
    await slotFrame.waitForTimeout(1000);
    
    // Second dropdown
    await slotFrame.evaluate(() => {
      const buttons = document.querySelectorAll('button.dropdown-toggle');
      if (buttons[1]) buttons[1].click();
    });
    await slotFrame.waitForTimeout(1000);
    
    await slotFrame.evaluate(() => {
      const options = Array.from(document.querySelectorAll('.dropdown-menu.open li a'));
      if (options.length > 1) options[1].click(); // Select first real option
    });
    await slotFrame.waitForTimeout(1000);
    
    // Click Query
    await slotFrame.evaluate(() => {
      const queryButton = document.querySelector('a[onclick="Search()"]');
      if (queryButton) queryButton.click();
    });
    
    console.log('✓ Query executed');
    await slotFrame.waitForTimeout(3000);
    
    // Now let's explore the slot grid
    console.log('\n=== EXPLORING SLOT GRID ===');
    
    const slotInfo = await slotFrame.evaluate(() => {
      const info = {
        totalSlots: 0,
        editButtons: [],
        slotStructure: []
      };
      
      // Find all Edit buttons
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      
      info.totalSlots = editButtons.length;
      
      // Analyze the structure around the first few Edit buttons
      editButtons.slice(0, 5).forEach((btn, index) => {
        // Find parent container
        let container = btn.parentElement;
        while (container && !container.className.includes('slot') && !container.className.includes('col')) {
          container = container.parentElement;
        }
        
        if (container) {
          // Look for slot number or identifier
          const text = container.textContent;
          const slotInfo = {
            index: index,
            containerClass: container.className,
            text: text.substring(0, 100),
            hasProduct: text.includes('Product') || text.includes('商品')
          };
          
          info.slotStructure.push(slotInfo);
        }
        
        // Highlight first few slots
        if (index < 5) {
          btn.style.border = '3px solid red';
          btn.style.backgroundColor = 'yellow';
        }
      });
      
      return info;
    });
    
    console.log(`Total slots found: ${slotInfo.totalSlots}`);
    console.log('First few slots:', slotInfo.slotStructure);
    
    // Take screenshot of grid
    await page.screenshot({ 
      path: `screenshots/slot_grid_highlighted_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== CLICKING FIRST EDIT BUTTON ===');
    
    // Click the first Edit button
    const editClicked = await slotFrame.evaluate(() => {
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      
      if (editButtons.length > 0) {
        console.log('Clicking first Edit button');
        editButtons[0].click();
        return true;
      }
      return false;
    });
    
    if (editClicked) {
      console.log('✓ Clicked first Edit button');
    }
    
    // Wait for modal or form to appear
    await slotFrame.waitForTimeout(3000);
    
    // Check what appeared
    console.log('\n=== CHECKING EDIT FORM ===');
    
    const editFormInfo = await slotFrame.evaluate(() => {
      const info = {
        modalFound: false,
        formFields: [],
        buttons: [],
        dropdowns: []
      };
      
      // Check for modal
      const modals = document.querySelectorAll('.modal, [class*="modal"]');
      modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          info.modalFound = true;
          modal.style.border = '5px solid green';
        }
      });
      
      // Find form inputs
      const inputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea');
      inputs.forEach(input => {
        info.formFields.push({
          type: input.type,
          name: input.name || input.id,
          placeholder: input.placeholder,
          value: input.value
        });
        input.style.backgroundColor = '#FFFFCC';
      });
      
      // Find buttons in the form
      document.querySelectorAll('button, input[type="submit"], a.btn').forEach(btn => {
        const text = btn.textContent || btn.value || '';
        if (text.trim()) {
          info.buttons.push(text.trim());
        }
      });
      
      // Find dropdowns
      document.querySelectorAll('select').forEach(select => {
        info.dropdowns.push({
          name: select.name || select.id,
          options: select.options.length
        });
      });
      
      // Look for product search or selection interface
      const searchBoxes = document.querySelectorAll('[placeholder*="search"], [placeholder*="Search"], input[type="search"]');
      info.hasSearchBox = searchBoxes.length > 0;
      
      return info;
    });
    
    console.log('Edit form info:');
    console.log('Modal found:', editFormInfo.modalFound);
    console.log('Form fields:', editFormInfo.formFields);
    console.log('Buttons:', editFormInfo.buttons);
    console.log('Dropdowns:', editFormInfo.dropdowns);
    console.log('Has search box:', editFormInfo.hasSearchBox);
    
    // Take screenshot of edit form
    await page.screenshot({ 
      path: `screenshots/slot_edit_form_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Screenshots saved');
    console.log('\nBrowser remains open for inspection.');
    console.log('We can now see how to assign products to slots!');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { editSlot };

// Run if called directly
if (require.main === module) {
  editSlot().catch(console.error);
}