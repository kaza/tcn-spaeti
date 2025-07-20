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

async function handleBootstrapSelects() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 2000 // Extra slow to debug
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
    
    // Get the slot management iframe
    const slotFrame = page.frames().find(frame => 
      frame.url().includes('Selection/Index')
    );
    
    if (!slotFrame) {
      throw new Error('Could not find slot management iframe');
    }
    
    console.log('✓ In slot management iframe');
    
    console.log('\n=== ANALYZING BOOTSTRAP SELECT STRUCTURE ===');
    
    // First, let's understand the structure
    const selectInfo = await slotFrame.evaluate(() => {
      const info = {
        bootstrapSelects: [],
        regularSelects: []
      };
      
      // Find all bootstrap-select wrappers
      const bootstrapWrappers = document.querySelectorAll('.bootstrap-select');
      console.log(`Found ${bootstrapWrappers.length} Bootstrap Select wrappers`);
      
      bootstrapWrappers.forEach((wrapper, index) => {
        // Find the button
        const button = wrapper.querySelector('button.dropdown-toggle');
        // Find the actual select
        const select = wrapper.querySelector('select');
        
        if (button && select) {
          const selectData = {
            index: index,
            buttonText: button.textContent.trim(),
            selectId: select.id,
            selectName: select.name,
            optionCount: select.options.length,
            options: []
          };
          
          // Get all options
          for (let i = 0; i < select.options.length; i++) {
            selectData.options.push({
              value: select.options[i].value,
              text: select.options[i].text
            });
          }
          
          info.bootstrapSelects.push(selectData);
          
          // Highlight
          wrapper.style.border = '3px solid ' + (index === 0 ? 'red' : 'blue');
        }
      });
      
      // Also find regular selects
      document.querySelectorAll('select').forEach(select => {
        info.regularSelects.push({
          id: select.id,
          name: select.name,
          optionCount: select.options.length
        });
      });
      
      return info;
    });
    
    console.log('Bootstrap Selects found:', selectInfo.bootstrapSelects);
    console.log('Regular Selects found:', selectInfo.regularSelects);
    
    // Take screenshot of highlighted selects
    await page.screenshot({ 
      path: `screenshots/slot_bootstrap_analysis_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== METHOD 1: USING THE ACTUAL SELECT ELEMENT ===');
    
    // Try to set the value directly on the select element
    const method1Result = await slotFrame.evaluate(() => {
      const results = [];
      
      // First select (Group) - should be MiGroup
      const groupSelect = document.getElementById('MiGroup');
      if (groupSelect) {
        console.log('Found MiGroup select');
        // Find option with "Default Unit2"
        for (let i = 0; i < groupSelect.options.length; i++) {
          if (groupSelect.options[i].text.includes('Default Unit2')) {
            groupSelect.selectedIndex = i;
            groupSelect.value = groupSelect.options[i].value;
            
            // Trigger events
            groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Also trigger on the bootstrap-select
            $(groupSelect).selectpicker('refresh');
            
            results.push('Set Group to Default Unit2');
            break;
          }
        }
      }
      
      // Second select (Machine) - should be MachineID
      const machineSelect = document.getElementById('MachineID');
      if (machineSelect) {
        console.log('Found MachineID select');
        console.log('Options:', machineSelect.options.length);
        
        // If no options, we might need to wait for them to load
        if (machineSelect.options.length > 1) {
          // Select first real option (skip --Please choose--)
          machineSelect.selectedIndex = 1;
          machineSelect.value = machineSelect.options[1].value;
          
          // Trigger events
          machineSelect.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Also trigger on the bootstrap-select
          $(machineSelect).selectpicker('refresh');
          
          results.push('Set Machine to first available option');
        } else {
          results.push('Machine select has no options yet');
        }
      }
      
      return results;
    });
    
    console.log('Method 1 results:', method1Result);
    await slotFrame.waitForTimeout(2000);
    
    console.log('\n=== METHOD 2: USING BOOTSTRAP-SELECT API ===');
    
    // Try using the bootstrap-select API if jQuery is available
    const method2Result = await slotFrame.evaluate(() => {
      if (typeof $ === 'undefined') {
        return 'jQuery not available';
      }
      
      try {
        // Set the group select
        $('#MiGroup').selectpicker('val', $('#MiGroup option:contains("Default Unit2")').val());
        
        // Wait a bit for machine options to load
        setTimeout(() => {
          // Set the machine select to first real option
          const machineOptions = $('#MachineID option');
          if (machineOptions.length > 1) {
            $('#MachineID').selectpicker('val', $(machineOptions[1]).val());
          }
        }, 1000);
        
        return 'Bootstrap-select API method executed';
      } catch (e) {
        return 'Error: ' + e.message;
      }
    });
    
    console.log('Method 2 result:', method2Result);
    await slotFrame.waitForTimeout(3000);
    
    console.log('\n=== METHOD 3: CLICK SIMULATION WITH RETRIES ===');
    
    // More robust clicking with retries
    async function clickBootstrapSelect(frame, buttonIndex, optionText) {
      // Click the button
      const buttonClicked = await frame.evaluate((index) => {
        const buttons = document.querySelectorAll('button.dropdown-toggle');
        if (buttons[index]) {
          buttons[index].click();
          return true;
        }
        return false;
      }, buttonIndex);
      
      if (!buttonClicked) return false;
      
      await frame.waitForTimeout(1000);
      
      // Wait for dropdown to be visible
      await frame.waitForFunction(() => {
        const dropdown = document.querySelector('.dropdown-menu.open');
        return dropdown && window.getComputedStyle(dropdown).display !== 'none';
      }, { timeout: 5000 }).catch(() => {});
      
      // Click the option
      const optionClicked = await frame.evaluate((text) => {
        const items = document.querySelectorAll('.dropdown-menu.open li a');
        for (const item of items) {
          if (item.textContent.includes(text)) {
            item.click();
            return true;
          }
        }
        return false;
      }, optionText);
      
      return optionClicked;
    }
    
    // Try to select Default Unit2
    console.log('Selecting Default Unit2...');
    const group = await clickBootstrapSelect(slotFrame, 0, 'Default Unit2');
    console.log(group ? '✓ Selected Default Unit2' : '✗ Failed to select Default Unit2');
    
    await slotFrame.waitForTimeout(2000);
    
    // Try to select first machine
    console.log('Selecting first machine...');
    const machine = await clickBootstrapSelect(slotFrame, 1, 'Slatko');
    if (!machine) {
      // Try to select any non-placeholder option
      const anyMachine = await slotFrame.evaluate(() => {
        const buttons = document.querySelectorAll('button.dropdown-toggle');
        if (buttons[1]) buttons[1].click();
        
        setTimeout(() => {
          const items = document.querySelectorAll('.dropdown-menu.open li a');
          if (items.length > 1) {
            items[1].click();
            return true;
          }
        }, 1000);
        
        return false;
      });
      console.log(anyMachine ? '✓ Selected first available machine' : '✗ Failed to select machine');
    } else {
      console.log('✓ Selected Slatko machine');
    }
    
    await slotFrame.waitForTimeout(2000);
    
    // Check final state
    console.log('\n=== FINAL STATE CHECK ===');
    
    const finalState = await slotFrame.evaluate(() => {
      const state = {
        dropdowns: []
      };
      
      document.querySelectorAll('.bootstrap-select button.dropdown-toggle').forEach((btn, index) => {
        state.dropdowns.push({
          index: index,
          text: btn.textContent.trim()
        });
      });
      
      return state;
    });
    
    console.log('Final dropdown states:', finalState.dropdowns);
    
    // Take final screenshot
    await page.screenshot({ 
      path: `screenshots/slot_bootstrap_final_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    // Now try Query
    console.log('\n=== CLICKING QUERY ===');
    
    const queryClicked = await slotFrame.evaluate(() => {
      const queryBtn = document.querySelector('a[onclick="Search()"]');
      if (queryBtn) {
        queryBtn.click();
        return true;
      }
      return false;
    });
    
    console.log(queryClicked ? '✓ Clicked Query' : '✗ Query button not found');
    
    await slotFrame.waitForTimeout(5000);
    
    // Check for slots
    const slotsFound = await slotFrame.evaluate(() => {
      const editButtons = document.querySelectorAll('button, a').length;
      return editButtons;
    });
    
    console.log(`\nTotal buttons after query: ${slotsFound}`);
    
    console.log('\n✓ Complete');
    console.log('Browser remains open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  handleBootstrapSelects().catch(console.error);
}