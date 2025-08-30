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

async function querySlotManagement() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await login(page);
    
    // Navigate to slot management
    console.log('\n=== NAVIGATING TO SLOT MANAGEMENT ===');
    
    // Click Vending machine management
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('span, a, li'));
      const vendingMgmt = elements.find(el => 
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
      const links = Array.from(document.querySelectorAll('a'));
      const slotLink = links.find(link => {
        const onclick = link.getAttribute('onclick') || '';
        return onclick.includes('SetMenuLinkUrl(43');
      });
      if (slotLink) slotLink.click();
    });
    
    // Wait for iframe to load
    await page.waitForTimeout(5000);
    await page.waitForSelector('iframe[id="43"]', { timeout: 10000 });
    
    // Get the slot management iframe
    const slotFrame = page.frames().find(frame => 
      frame.url().includes('Selection/Index')
    );
    
    if (!slotFrame) {
      throw new Error('Could not find slot management iframe');
    }
    
    console.log('✓ Found slot management iframe');
    
    // Take screenshot before
    await page.screenshot({ 
      path: `screenshots/slot_before_dropdowns_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== HANDLING FIRST DROPDOWN (GROUP) ===');
    
    // These Bootstrap Select dropdowns are tricky - we need to click the button first
    const firstDropdownClicked = await slotFrame.evaluate(() => {
      // Find the first dropdown button
      const buttons = Array.from(document.querySelectorAll('button.dropdown-toggle'));
      console.log(`Found ${buttons.length} dropdown buttons`);
      
      // Look for the first one (should be the group dropdown)
      if (buttons.length > 0) {
        const firstButton = buttons[0];
        console.log('First dropdown text:', firstButton.textContent);
        firstButton.style.border = '3px solid red';
        firstButton.click();
        return true;
      }
      return false;
    });
    
    if (firstDropdownClicked) {
      console.log('✓ Clicked first dropdown');
    }
    
    await slotFrame.waitForTimeout(1000);
    
    // Now select "Default Unit2" from the dropdown menu
    const firstOptionSelected = await slotFrame.evaluate(() => {
      // Look for the dropdown menu items
      const dropdownItems = Array.from(document.querySelectorAll('.dropdown-menu.open li a'));
      console.log(`Found ${dropdownItems.length} dropdown items`);
      
      const defaultUnit2 = dropdownItems.find(item => 
        item.textContent?.includes('Default Unit2')
      );
      
      if (defaultUnit2) {
        console.log('Found Default Unit2 option');
        defaultUnit2.style.backgroundColor = 'yellow';
        defaultUnit2.click();
        return true;
      }
      return false;
    });
    
    if (firstOptionSelected) {
      console.log('✓ Selected Default Unit2');
    }
    
    await slotFrame.waitForTimeout(2000);
    
    console.log('\n=== HANDLING SECOND DROPDOWN (MACHINE) ===');
    
    // Click the second dropdown
    const secondDropdownClicked = await slotFrame.evaluate(() => {
      // Find all dropdown buttons again
      const buttons = Array.from(document.querySelectorAll('button.dropdown-toggle'));
      console.log(`Found ${buttons.length} dropdown buttons`);
      
      // The second one should be the machine dropdown
      if (buttons.length > 1) {
        const secondButton = buttons[1];
        console.log('Second dropdown text:', secondButton.textContent);
        secondButton.style.border = '3px solid blue';
        secondButton.click();
        return true;
      }
      return false;
    });
    
    if (secondDropdownClicked) {
      console.log('✓ Clicked second dropdown');
    }
    
    await slotFrame.waitForTimeout(1000);
    
    // Select "Slatko 2503050187" from the second dropdown
    const secondOptionSelected = await slotFrame.evaluate(() => {
      // Look for the dropdown menu items in the open dropdown
      const dropdownItems = Array.from(document.querySelectorAll('.dropdown-menu.open li a'));
      console.log(`Found ${dropdownItems.length} dropdown items`);
      
      // Log all options to see what's available
      dropdownItems.forEach((item, index) => {
        console.log(`Option ${index}: "${item.textContent.trim()}"`);
      });
      
      const slatkoOption = dropdownItems.find(item => 
        item.textContent?.includes('Slatko 2503050187')
      );
      
      if (slatkoOption) {
        console.log('Found Slatko 2503050187 option');
        slatkoOption.style.backgroundColor = 'lime';
        slatkoOption.click();
        return true;
      }
      return false;
    });
    
    if (secondOptionSelected) {
      console.log('✓ Selected Slatko 2503050187');
    } else {
      console.log('⚠️  Could not find Slatko 2503050187 - selecting first available option');
      
      // Select first non-placeholder option
      await slotFrame.evaluate(() => {
        const dropdownItems = Array.from(document.querySelectorAll('.dropdown-menu.open li a'));
        if (dropdownItems.length > 1) {
          dropdownItems[1].click(); // Skip "--Please choose--"
        }
      });
    }
    
    await slotFrame.waitForTimeout(2000);
    
    // Take screenshot after dropdowns
    await page.screenshot({ 
      path: `screenshots/slot_after_dropdowns_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== CLICKING QUERY BUTTON ===');
    
    // Click the Query button with Search() function
    const queryClicked = await slotFrame.evaluate(() => {
      // Look for the Query button
      const queryButton = document.querySelector('a[onclick="Search()"]');
      
      if (queryButton) {
        console.log('Found Query button');
        queryButton.style.border = '5px solid green';
        queryButton.style.backgroundColor = 'yellow';
        queryButton.click();
        return true;
      }
      
      // Alternative: find by text
      const links = Array.from(document.querySelectorAll('a.btn'));
      const queryLink = links.find(link => 
        link.textContent?.includes('Query')
      );
      
      if (queryLink) {
        console.log('Found Query button by text');
        queryLink.click();
        return true;
      }
      
      return false;
    });
    
    if (queryClicked) {
      console.log('✓ Clicked Query button');
    } else {
      console.log('❌ Could not find Query button');
    }
    
    // Wait for results to load
    console.log('\nWaiting for query results...');
    await slotFrame.waitForTimeout(5000);
    
    // Check what appeared after query
    const queryResults = await slotFrame.evaluate(() => {
      const results = {
        tables: document.querySelectorAll('table').length,
        rows: document.querySelectorAll('tr').length,
        buttons: [],
        gridItems: document.querySelectorAll('.grid-item, .slot-item, [class*="slot"]').length
      };
      
      // Find any new buttons that appeared
      document.querySelectorAll('button, a.btn').forEach(btn => {
        const text = btn.textContent?.trim();
        if (text) {
          results.buttons.push(text);
        }
      });
      
      // Check for slot grid or visual representation
      const possibleSlotContainers = document.querySelectorAll('[class*="slot"], [class*="grid"], [id*="slot"]');
      results.slotContainers = possibleSlotContainers.length;
      
      return results;
    });
    
    console.log('\n=== QUERY RESULTS ===');
    console.log('Tables found:', queryResults.tables);
    console.log('Rows found:', queryResults.rows);
    console.log('Slot/Grid items:', queryResults.gridItems);
    console.log('Slot containers:', queryResults.slotContainers);
    console.log('Buttons:', queryResults.buttons);
    
    // Take final screenshot
    await page.screenshot({ 
      path: `screenshots/slot_query_results_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Final screenshot saved');
    console.log('\nBrowser remains open for inspection.');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { querySlotManagement };

// Run if called directly
if (require.main === module) {
  querySlotManagement().catch(console.error);
}