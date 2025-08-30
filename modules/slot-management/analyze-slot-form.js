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

async function analyzeSlotForm() {
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
    
    // Select machine
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
    
    // Click first Edit button
    console.log('\n=== CLICKING FIRST EDIT BUTTON ===');
    
    const editClicked = await slotFrame.evaluate(() => {
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      
      if (editButtons.length > 0) {
        editButtons[0].click();
        return true;
      }
      return false;
    });
    
    if (!editClicked) {
      console.log('❌ Could not find Edit button');
      return;
    }
    
    console.log('✓ Clicked first Edit button');
    await slotFrame.waitForTimeout(3000);
    
    console.log('\n=== ANALYZING EDIT FORM STRUCTURE ===');
    
    const formAnalysis = await slotFrame.evaluate(() => {
      const analysis = {
        modalFound: false,
        allInputs: [],
        allSelects: [],
        allButtons: [],
        bootstrapSelects: [],
        formLayout: []
      };
      
      // Find the visible modal
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      if (!modal) {
        analysis.error = 'No modal found';
        return analysis;
      }
      
      analysis.modalFound = true;
      
      // Get modal title
      const modalTitle = modal.querySelector('.modal-title, h4, h3');
      if (modalTitle) {
        analysis.modalTitle = modalTitle.textContent.trim();
      }
      
      // Find all inputs
      modal.querySelectorAll('input').forEach((input, index) => {
        const inputInfo = {
          index: index,
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          value: input.value,
          className: input.className,
          readonly: input.readOnly,
          disabled: input.disabled,
          label: null
        };
        
        // Try to find associated label
        const label = modal.querySelector(`label[for="${input.id}"]`);
        if (label) {
          inputInfo.label = label.textContent.trim();
        } else {
          // Check parent for label text
          const parent = input.parentElement;
          if (parent) {
            const text = parent.textContent.replace(input.value, '').trim();
            if (text) inputInfo.label = text;
          }
        }
        
        // Highlight inputs
        input.style.backgroundColor = index === 0 ? '#FFCCCC' : '#CCFFCC';
        input.style.border = '2px solid red';
        
        analysis.allInputs.push(inputInfo);
      });
      
      // Find all selects (including Bootstrap selects)
      modal.querySelectorAll('select').forEach((select, index) => {
        const selectInfo = {
          index: index,
          name: select.name,
          id: select.id,
          className: select.className,
          optionCount: select.options.length,
          selectedValue: select.value,
          selectedText: select.options[select.selectedIndex]?.text,
          firstFewOptions: Array.from(select.options).slice(0, 5).map(opt => ({
            value: opt.value,
            text: opt.text
          }))
        };
        
        // Check if it's a Bootstrap select
        const wrapper = select.closest('.bootstrap-select');
        if (wrapper) {
          selectInfo.isBootstrapSelect = true;
          const button = wrapper.querySelector('button.dropdown-toggle');
          if (button) {
            selectInfo.buttonText = button.textContent.trim();
          }
        }
        
        analysis.allSelects.push(selectInfo);
      });
      
      // Find Bootstrap Select buttons
      modal.querySelectorAll('.bootstrap-select').forEach((wrapper, index) => {
        const button = wrapper.querySelector('button.dropdown-toggle');
        const select = wrapper.querySelector('select');
        
        if (button) {
          button.style.border = '3px solid blue';
          button.style.backgroundColor = '#FFFFCC';
          
          analysis.bootstrapSelects.push({
            index: index,
            buttonText: button.textContent.trim(),
            selectId: select?.id,
            selectName: select?.name,
            position: button.getBoundingClientRect()
          });
        }
      });
      
      // Find all buttons
      modal.querySelectorAll('button, input[type="submit"], a.btn').forEach((btn, index) => {
        const text = btn.textContent || btn.value || '';
        if (text.trim()) {
          analysis.allButtons.push({
            index: index,
            text: text.trim(),
            type: btn.tagName,
            className: btn.className,
            onclick: btn.getAttribute('onclick'),
            dataAttributes: Array.from(btn.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => ({ name: attr.name, value: attr.value }))
          });
        }
      });
      
      // Analyze form layout
      const formGroups = modal.querySelectorAll('.form-group, .row, [class*="form"]');
      formGroups.forEach((group, index) => {
        const groupInfo = {
          index: index,
          className: group.className,
          text: group.textContent.substring(0, 100).trim(),
          hasInput: group.querySelector('input') !== null,
          hasSelect: group.querySelector('select') !== null,
          hasBootstrapSelect: group.querySelector('.bootstrap-select') !== null
        };
        analysis.formLayout.push(groupInfo);
      });
      
      return analysis;
    });
    
    console.log('Form Analysis:', JSON.stringify(formAnalysis, null, 2));
    
    // Take screenshot
    await page.screenshot({ 
      path: `screenshots/slot_form_analysis_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    // If we found Bootstrap selects, let's try to interact with them
    if (formAnalysis.bootstrapSelects.length > 0) {
      console.log('\n=== BOOTSTRAP SELECT DETAILS ===');
      console.log(`Found ${formAnalysis.bootstrapSelects.length} Bootstrap Select dropdowns`);
      
      // Try to click the first Bootstrap select
      console.log('\nClicking first Bootstrap Select dropdown...');
      
      await slotFrame.evaluate(() => {
        const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (modal) {
          const firstBootstrapButton = modal.querySelector('.bootstrap-select button.dropdown-toggle');
          if (firstBootstrapButton) {
            console.log('Clicking:', firstBootstrapButton.textContent);
            firstBootstrapButton.click();
          }
        }
      });
      
      await slotFrame.waitForTimeout(1500);
      
      // Check what options are available
      const dropdownOptions = await slotFrame.evaluate(() => {
        const options = [];
        const openDropdown = document.querySelector('.dropdown-menu.open');
        
        if (openDropdown) {
          openDropdown.querySelectorAll('li a').forEach((item, index) => {
            options.push({
              index: index,
              text: item.textContent.trim(),
              value: item.getAttribute('data-tokens') || item.getAttribute('data-value')
            });
            
            // Highlight options
            item.style.backgroundColor = index % 2 === 0 ? '#FFEEEE' : '#EEFFEE';
          });
        }
        
        return options;
      });
      
      console.log('\nDropdown options:', dropdownOptions);
      
      // Take screenshot with dropdown open
      await page.screenshot({ 
        path: `screenshots/slot_form_dropdown_open_${getTimestamp()}.png`,
        fullPage: true 
      });
    }
    
    console.log('\n✓ Analysis complete');
    console.log('Check screenshots for visual reference');
    console.log('Browser remains open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { analyzeSlotForm };

// Run if called directly
if (require.main === module) {
  analyzeSlotForm().catch(console.error);
}