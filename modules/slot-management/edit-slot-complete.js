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

async function editSlotComplete() {
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
    
    // Use the working method from bootstrap-select-handler
    console.log('\n=== SELECTING MACHINE USING WORKING METHOD ===');
    
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
    
    // Analyze the slot structure
    console.log('\n=== ANALYZING SLOT STRUCTURE ===');
    
    const slotAnalysis = await slotFrame.evaluate(() => {
      const analysis = {
        totalEditButtons: 0,
        totalClearButtons: 0,
        firstSlotInfo: null,
        slotPattern: null,
        productInfo: []
      };
      
      // Find all Edit and Clear buttons
      const allButtons = Array.from(document.querySelectorAll('button, a'));
      const editButtons = allButtons.filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      const clearButtons = allButtons.filter(btn => 
        btn.textContent?.trim() === 'Clear'
      );
      
      analysis.totalEditButtons = editButtons.length;
      analysis.totalClearButtons = clearButtons.length;
      
      // Analyze first few slots
      for (let i = 0; i < Math.min(5, editButtons.length); i++) {
        const editBtn = editButtons[i];
        
        // Find the parent container that contains both Edit and Clear
        let container = editBtn.parentElement;
        let depth = 0;
        while (container && depth < 10) {
          const text = container.textContent || '';
          
          // Check if this container has both Edit and Clear
          if (text.includes('Edit') && text.includes('Clear')) {
            // Extract product info
            const cleanText = text.replace('Edit', '').replace('Clear', '').trim();
            
            // Try to find slot number
            const numbers = text.match(/\d+/g);
            const slotNum = numbers ? numbers[0] : null;
            
            analysis.productInfo.push({
              slotIndex: i,
              slotNumber: slotNum,
              productText: cleanText.substring(0, 100),
              hasProduct: !cleanText.includes('Empty') && cleanText.length > 10
            });
            
            // Highlight first slot
            if (i === 0) {
              container.style.border = '5px solid red';
              container.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
              analysis.firstSlotInfo = {
                containerClass: container.className,
                innerHTML: container.innerHTML.substring(0, 500)
              };
            }
            
            break;
          }
          
          container = container.parentElement;
          depth++;
        }
        
        // Highlight Edit button
        editBtn.style.border = '3px solid green';
        editBtn.style.backgroundColor = 'lime';
      }
      
      return analysis;
    });
    
    console.log(`Total slots found: ${slotAnalysis.totalEditButtons} Edit buttons, ${slotAnalysis.totalClearButtons} Clear buttons`);
    console.log('First few slots:', slotAnalysis.productInfo);
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: `screenshots/slot_grid_analyzed_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== CLICKING EDIT ON FIRST SLOT ===');
    
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
      console.log('✓ Clicked Edit on first slot');
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
        productSelectionMethod: null,
        currentProduct: null,
        availableActions: []
      };
      
      // Check for visible modal
      const modals = document.querySelectorAll('.modal, [class*="modal"]');
      modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          analysis.modalFound = true;
          modal.style.border = '5px solid blue';
          
          // Look for product selection methods
          
          // Method 1: Product dropdown
          const productSelect = modal.querySelector('select[name*="product"], select[name*="commodity"], select[id*="product"], select[id*="commodity"]');
          if (productSelect) {
            analysis.productSelectionMethod = 'dropdown';
            analysis.currentProduct = productSelect.options[productSelect.selectedIndex]?.text;
            analysis.formStructure.productDropdown = {
              id: productSelect.id,
              name: productSelect.name,
              optionCount: productSelect.options.length,
              options: Array.from(productSelect.options).slice(0, 10).map(opt => ({
                value: opt.value,
                text: opt.text
              }))
            };
            productSelect.style.backgroundColor = '#FFFFCC';
            productSelect.style.border = '3px solid orange';
          }
          
          // Method 2: Search input
          const searchInput = modal.querySelector('input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="product"], input[placeholder*="commodity"]');
          if (searchInput) {
            analysis.productSelectionMethod = 'search';
            analysis.currentProduct = searchInput.value;
            analysis.formStructure.searchInput = {
              id: searchInput.id,
              placeholder: searchInput.placeholder,
              value: searchInput.value
            };
            searchInput.style.backgroundColor = '#CCFFCC';
            searchInput.style.border = '3px solid green';
          }
          
          // Method 3: Product list or grid
          const productItems = modal.querySelectorAll('[class*="product-item"], [class*="commodity-item"], .list-group-item');
          if (productItems.length > 0) {
            analysis.productSelectionMethod = 'list';
            analysis.formStructure.productList = {
              itemCount: productItems.length,
              firstFewItems: Array.from(productItems).slice(0, 5).map(item => item.textContent.trim())
            };
          }
          
          // Look for quantity/capacity input
          const quantityInputs = modal.querySelectorAll('input[name*="quantity"], input[name*="Quantity"], input[name*="capacity"], input[name*="Capacity"], input[type="number"]');
          quantityInputs.forEach(input => {
            analysis.formStructure[input.name || input.id || 'quantity'] = {
              type: 'number',
              value: input.value,
              placeholder: input.placeholder
            };
            input.style.backgroundColor = '#FFCCFF';
          });
          
          // Find all buttons
          const buttons = modal.querySelectorAll('button, input[type="submit"], a.btn');
          buttons.forEach(btn => {
            const text = btn.textContent || btn.value || '';
            if (text.trim()) {
              analysis.availableActions.push({
                text: text.trim(),
                onclick: btn.getAttribute('onclick')
              });
            }
          });
          
          // Check modal title
          const modalTitle = modal.querySelector('.modal-title, h4, h3');
          if (modalTitle) {
            analysis.modalTitle = modalTitle.textContent.trim();
          }
        }
      });
      
      return analysis;
    });
    
    console.log('Edit form analysis:', JSON.stringify(editFormAnalysis, null, 2));
    
    // Take screenshot of edit form
    await page.screenshot({ 
      path: `screenshots/slot_edit_form_analyzed_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    // If we found a product dropdown, let's see what products are available
    if (editFormAnalysis.productSelectionMethod === 'dropdown' && editFormAnalysis.formStructure.productDropdown) {
      console.log('\n=== AVAILABLE PRODUCTS IN DROPDOWN ===');
      console.log('Total products:', editFormAnalysis.formStructure.productDropdown.optionCount);
      console.log('First 10 products:', editFormAnalysis.formStructure.productDropdown.options);
    }
    
    console.log('\n✓ Analysis complete');
    console.log('Product selection method:', editFormAnalysis.productSelectionMethod);
    console.log('Available actions:', editFormAnalysis.availableActions);
    
    // Try to change the product if dropdown exists
    if (editFormAnalysis.productSelectionMethod === 'dropdown') {
      console.log('\n=== ATTEMPTING TO CHANGE PRODUCT ===');
      
      const productChanged = await slotFrame.evaluate(() => {
        const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (!modal) return false;
        
        const productSelect = modal.querySelector('select[name*="product"], select[name*="commodity"], select[id*="product"], select[id*="commodity"]');
        if (productSelect && productSelect.options.length > 1) {
          // Select a different product (second option if available)
          const currentIndex = productSelect.selectedIndex;
          const newIndex = currentIndex === 1 ? 2 : 1;
          
          if (productSelect.options[newIndex]) {
            productSelect.selectedIndex = newIndex;
            productSelect.value = productSelect.options[newIndex].value;
            
            // Trigger change event
            productSelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
              success: true,
              oldProduct: productSelect.options[currentIndex]?.text,
              newProduct: productSelect.options[newIndex].text
            };
          }
        }
        
        return false;
      });
      
      if (productChanged && productChanged.success) {
        console.log(`✓ Changed product from "${productChanged.oldProduct}" to "${productChanged.newProduct}"`);
      }
    }
    
    console.log('\nBrowser remains open for manual exploration');
    console.log('You can now see how to assign products to slots!');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { editSlotComplete };

// Run if called directly
if (require.main === module) {
  editSlotComplete().catch(console.error);
}