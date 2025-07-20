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

async function editSlotProduct() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await login(page);
    
    console.log('\n=== QUICK NAVIGATION TO SLOT MANAGEMENT ===');
    
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
    
    // Quick query using the working method
    console.log('\n=== PERFORMING QUICK QUERY ===');
    
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
    
    // Click second dropdown and select first machine
    await slotFrame.evaluate(() => {
      const buttons = document.querySelectorAll('button.dropdown-toggle');
      if (buttons[1]) buttons[1].click();
    });
    await slotFrame.waitForTimeout(1000);
    
    await slotFrame.evaluate(() => {
      const items = document.querySelectorAll('.dropdown-menu.open li a');
      if (items.length > 1) items[1].click();
    });
    await slotFrame.waitForTimeout(1000);
    
    // Click Query
    await slotFrame.evaluate(() => {
      const queryBtn = document.querySelector('a[onclick="Search()"]');
      if (queryBtn) queryBtn.click();
    });
    
    console.log('✓ Query executed');
    await slotFrame.waitForTimeout(5000);
    
    // Analyze the slot structure
    console.log('\n=== ANALYZING SLOT STRUCTURE ===');
    
    const slotAnalysis = await slotFrame.evaluate(() => {
      const analysis = {
        totalEditButtons: 0,
        firstSlotInfo: null,
        slotPattern: null
      };
      
      // Find all Edit buttons
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      
      analysis.totalEditButtons = editButtons.length;
      
      if (editButtons.length > 0) {
        // Analyze the first slot
        const firstEdit = editButtons[0];
        
        // Find the container that holds this Edit button
        let container = firstEdit.parentElement;
        let depth = 0;
        while (container && depth < 10) {
          // Look for slot identifier
          const text = container.textContent || '';
          const innerHTML = container.innerHTML || '';
          
          // Check if this container has both Edit and Clear
          if (text.includes('Edit') && text.includes('Clear')) {
            // Extract slot number if visible
            const numbers = text.match(/\d+/g);
            
            analysis.firstSlotInfo = {
              containerTag: container.tagName,
              containerClass: container.className,
              text: text.substring(0, 200),
              possibleSlotNumber: numbers ? numbers[0] : null,
              innerHTML: innerHTML.substring(0, 500)
            };
            
            // Highlight the first slot
            container.style.border = '5px solid red';
            container.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            
            break;
          }
          
          container = container.parentElement;
          depth++;
        }
        
        // Highlight first Edit button
        firstEdit.style.border = '3px solid green';
        firstEdit.style.backgroundColor = 'lime';
        firstEdit.style.fontSize = '20px';
      }
      
      return analysis;
    });
    
    console.log(`Total Edit buttons found: ${slotAnalysis.totalEditButtons}`);
    console.log('First slot info:', slotAnalysis.firstSlotInfo);
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: `screenshots/slot_1_before_edit_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== CLICKING EDIT ON SLOT 1 ===');
    
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
      console.log('✓ Clicked Edit on slot 1');
    } else {
      console.log('❌ Could not find Edit button');
      return;
    }
    
    // Wait for modal/form to appear
    await slotFrame.waitForTimeout(3000);
    
    console.log('\n=== ANALYZING EDIT FORM ===');
    
    const editFormAnalysis = await slotFrame.evaluate(() => {
      const analysis = {
        modalFound: false,
        formStructure: {},
        productInfo: {},
        availableActions: []
      };
      
      // Check for modal
      const modals = document.querySelectorAll('.modal, [class*="modal"]');
      modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          analysis.modalFound = true;
          modal.style.border = '5px solid blue';
          
          // Look for form elements in the modal
          const inputs = modal.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
          const buttons = modal.querySelectorAll('button, input[type="submit"], a.btn');
          
          // Analyze inputs
          inputs.forEach(input => {
            const label = input.placeholder || input.name || input.id || 'unknown';
            analysis.formStructure[label] = {
              type: input.type || input.tagName,
              value: input.value,
              id: input.id,
              name: input.name
            };
            
            // Highlight inputs
            input.style.backgroundColor = '#FFFFCC';
            input.style.border = '2px solid orange';
          });
          
          // Find buttons
          buttons.forEach(btn => {
            const text = btn.textContent || btn.value || '';
            if (text.trim()) {
              analysis.availableActions.push(text.trim());
            }
          });
          
          // Look for product-related information
          const modalText = modal.textContent || '';
          if (modalText.includes('Product') || modalText.includes('商品')) {
            analysis.productInfo.hasProductReference = true;
          }
          
          // Look for dropdowns or selection lists
          const selects = modal.querySelectorAll('select');
          selects.forEach(select => {
            analysis.formStructure[select.name || select.id] = {
              type: 'select',
              optionCount: select.options.length,
              options: Array.from(select.options).map(opt => opt.text)
            };
          });
          
          // Look for product search functionality
          const searchInputs = modal.querySelectorAll('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
          analysis.hasProductSearch = searchInputs.length > 0;
          
          // Look for quantity/capacity fields
          const quantityInputs = modal.querySelectorAll('input[name*="quantity"], input[name*="Quantity"], input[placeholder*="quantity"]');
          analysis.hasQuantityField = quantityInputs.length > 0;
        }
      });
      
      return analysis;
    });
    
    console.log('Edit form analysis:', JSON.stringify(editFormAnalysis, null, 2));
    
    // Take screenshot of edit form
    await page.screenshot({ 
      path: `screenshots/slot_1_edit_form_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    // Look for specific elements to modify product
    console.log('\n=== LOOKING FOR PRODUCT SELECTION ===');
    
    const productSelection = await slotFrame.evaluate(() => {
      const results = {
        method: null,
        currentProduct: null,
        availableProducts: []
      };
      
      // Method 1: Look for a select dropdown with products
      const productSelect = document.querySelector('select[name*="product"], select[id*="product"], select[name*="commodity"]');
      if (productSelect) {
        results.method = 'dropdown';
        results.currentProduct = productSelect.options[productSelect.selectedIndex]?.text;
        results.availableProducts = Array.from(productSelect.options).map(opt => ({
          value: opt.value,
          text: opt.text
        }));
      }
      
      // Method 2: Look for a search/autocomplete input
      const searchInput = document.querySelector('input[placeholder*="product"], input[placeholder*="commodity"], input[placeholder*="search"]');
      if (searchInput) {
        results.method = 'search';
        results.currentProduct = searchInput.value;
      }
      
      // Method 3: Look for a button that opens product selection
      const selectButton = Array.from(document.querySelectorAll('button, a')).find(btn => 
        btn.textContent.includes('Select') || btn.textContent.includes('Choose') || btn.textContent.includes('选择')
      );
      if (selectButton) {
        results.method = 'button';
        selectButton.style.border = '3px solid purple';
      }
      
      return results;
    });
    
    console.log('Product selection info:', productSelection);
    
    console.log('\n✓ Analysis complete');
    console.log('Browser remains open for manual exploration');
    console.log('We can see how products are assigned to slots');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { editSlotProduct };

// Run if called directly
if (require.main === module) {
  editSlotProduct().catch(console.error);
}