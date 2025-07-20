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

async function queryByBoxId() {
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
    
    // Take screenshot before
    await page.screenshot({ 
      path: `screenshots/slot_before_boxid_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== USING BOX ID INPUT ===');
    
    // Find and fill the boxId input
    const boxIdFilled = await slotFrame.evaluate((machineId) => {
      const boxIdInput = document.getElementById('boxId');
      
      if (boxIdInput) {
        console.log('Found boxId input');
        boxIdInput.style.border = '3px solid red';
        boxIdInput.style.backgroundColor = 'yellow';
        boxIdInput.value = machineId;
        
        // Trigger events
        boxIdInput.dispatchEvent(new Event('input', { bubbles: true }));
        boxIdInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      }
      
      return false;
    }, '2503050187');
    
    if (boxIdFilled) {
      console.log('✓ Filled box ID: 2503050187');
    } else {
      console.log('❌ Could not find boxId input');
    }
    
    await slotFrame.waitForTimeout(1000);
    
    console.log('\n=== CLICKING QUERY BUTTON ===');
    
    // Click the Query button
    const queryClicked = await slotFrame.evaluate(() => {
      // Look for the Query button
      const queryButton = document.querySelector('a[onclick="Search()"]');
      
      if (queryButton) {
        console.log('Found Query button');
        queryButton.style.border = '5px solid green';
        queryButton.style.backgroundColor = 'lime';
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
        queryLink.style.border = '5px solid green';
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
    
    // Wait for results
    console.log('\nWaiting for query results...');
    await slotFrame.waitForTimeout(5000);
    
    // Check results
    console.log('\n=== CHECKING QUERY RESULTS ===');
    
    const queryResults = await slotFrame.evaluate(() => {
      const results = {
        editButtons: 0,
        clearButtons: 0,
        slotInfo: [],
        gridFound: false
      };
      
      // Count Edit and Clear buttons
      const allButtons = Array.from(document.querySelectorAll('button, a'));
      results.editButtons = allButtons.filter(btn => btn.textContent?.trim() === 'Edit').length;
      results.clearButtons = allButtons.filter(btn => btn.textContent?.trim() === 'Clear').length;
      
      // Look for slot grid structure
      const possibleSlots = document.querySelectorAll('[class*="slot"], [class*="col-"], .row > div');
      results.gridFound = possibleSlots.length > 0;
      
      // Highlight first few Edit buttons
      const editButtons = allButtons.filter(btn => btn.textContent?.trim() === 'Edit');
      editButtons.slice(0, 10).forEach((btn, index) => {
        btn.style.border = '3px solid red';
        btn.style.backgroundColor = 'yellow';
        
        // Try to find slot number
        let parent = btn.parentElement;
        while (parent && parent.parentElement) {
          const text = parent.textContent || '';
          if (text.includes('Edit') && text.includes('Clear')) {
            results.slotInfo.push({
              slotIndex: index,
              text: text.replace('Edit', '').replace('Clear', '').trim().substring(0, 50)
            });
            break;
          }
          parent = parent.parentElement;
        }
      });
      
      return results;
    });
    
    console.log(`Found ${queryResults.editButtons} Edit buttons`);
    console.log(`Found ${queryResults.clearButtons} Clear buttons`);
    console.log('Grid found:', queryResults.gridFound);
    console.log('Sample slot info:', queryResults.slotInfo.slice(0, 5));
    
    // Take screenshot after query
    await page.screenshot({ 
      path: `screenshots/slot_after_boxid_query_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    if (queryResults.editButtons > 0) {
      console.log('\n✅ SUCCESS! Slot grid loaded');
      console.log('Each slot has Edit and Clear buttons');
      console.log('First 10 Edit buttons are highlighted');
    } else {
      console.log('\n⚠️  No slots found - check if machine ID is correct');
    }
    
    console.log('\n✓ Screenshots saved');
    console.log('Browser remains open for inspection.');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { queryByBoxId };

// Run if called directly
if (require.main === module) {
  queryByBoxId().catch(console.error);
}