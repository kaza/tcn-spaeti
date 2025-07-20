const { chromium } = require('playwright');

const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

async function addCommoditySlow() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 2000 // Very slow
  });

  try {
    const page = await browser.newPage();
    
    // Login
    console.log('=== STEP 1: LOGIN ===');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    await page.fill('#userName', 'Spaetitogo');
    await page.fill('#passWord', 'Zebra1234!');

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input'));
      const loginBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('sign') || 
        btn.textContent.toLowerCase().includes('login')
      );
      if (loginBtn) loginBtn.click();
    });
    
    await page.waitForTimeout(5000);
    console.log('✓ Logged in\n');
    
    // Navigate to Commodity Info
    console.log('=== STEP 2: NAVIGATE TO COMMODITY INFO ===');
    
    // Click Commodity management
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const commoditySpan = spans.find(span => 
        span.textContent?.includes('Commodity management')
      );
      if (commoditySpan) {
        commoditySpan.style.border = '3px solid red';
        commoditySpan.click();
        if (commoditySpan.parentElement) commoditySpan.parentElement.click();
      }
    });
    
    console.log('Clicked Commodity management, waiting...');
    await page.waitForTimeout(3000);
    
    // Navigate to Commodity info
    await page.evaluate(() => {
      if (typeof SetMenuLinkUrl === 'function') {
        SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false);
      }
    });
    
    console.log('Navigated to Commodity info, waiting for page to load...');
    await page.waitForTimeout(5000);
    console.log('✓ On Commodity info page\n');
    
    // Take screenshot of current state
    await page.screenshot({ path: `screenshots/before_add_click_${getTimestamp()}.png` });
    
    // Find Add button
    console.log('=== STEP 3: LOOKING FOR ADD BUTTON ===');
    console.log('Searching for Add button on the page...');
    
    const addButtonInfo = await page.evaluate(() => {
      // Search all possible Add buttons
      const allLinks = Array.from(document.querySelectorAll('a'));
      const results = [];
      
      allLinks.forEach((link, index) => {
        const text = link.textContent || '';
        const onclick = link.getAttribute('onclick') || '';
        
        if (text.includes('Add') || onclick.includes('Modal_User')) {
          link.style.border = '5px solid red';
          link.style.backgroundColor = 'yellow';
          
          results.push({
            index: index,
            text: text.trim(),
            onclick: onclick,
            classes: link.className,
            found: true
          });
        }
      });
      
      return results;
    });
    
    console.log('Found Add buttons:', addButtonInfo);
    console.log('Add buttons are highlighted in RED with YELLOW background\n');
    
    console.log('⏳ WAITING 5 SECONDS BEFORE CLICKING...');
    await page.waitForTimeout(5000);
    
    // Click Add button
    console.log('=== STEP 4: CLICKING ADD BUTTON ===');
    
    const clickResult = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const addButton = allLinks.find(link => {
        const onclick = link.getAttribute('onclick') || '';
        return onclick.includes("Modal_User('Add')");
      });
      
      if (addButton) {
        console.log('Clicking Add button now...');
        addButton.style.border = '10px solid green';
        addButton.click();
        return true;
      }
      return false;
    });
    
    if (clickResult) {
      console.log('✓ Add button clicked!');
    } else {
      console.log('✗ Could not find Add button to click');
      
      // Try calling Modal_User directly
      console.log('Trying to call Modal_User directly...');
      await page.evaluate(() => {
        if (typeof Modal_User === 'function') {
          Modal_User('Add');
        }
      });
    }
    
    console.log('Waiting for modal/form to appear...');
    await page.waitForTimeout(5000);
    
    // Check what appeared
    console.log('\n=== STEP 5: CHECKING FOR FORM ===');
    
    const formInfo = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
      const modals = document.querySelectorAll('.modal, .modal-dialog, [id*="modal"]');
      
      // Highlight all input fields
      inputs.forEach(input => {
        input.style.border = '3px solid blue';
        input.style.backgroundColor = '#e6f3ff';
      });
      
      return {
        inputCount: inputs.length,
        modalCount: modals.length,
        visibleModal: modals.length > 0 && window.getComputedStyle(modals[0]).display !== 'none'
      };
    });
    
    console.log('Form check results:');
    console.log(`- Found ${formInfo.inputCount} input fields (highlighted in BLUE)`);
    console.log(`- Found ${formInfo.modalCount} modal elements`);
    console.log(`- Modal visible: ${formInfo.visibleModal}`);
    
    if (formInfo.inputCount > 0) {
      console.log('\n=== STEP 6: FILLING FORM (SLOWLY) ===');
      console.log('⏳ Starting to fill form in 3 seconds...');
      await page.waitForTimeout(3000);
      
      const timestamp = getUnixTimestamp();
      const productName = `dummy${timestamp}`;
      
      console.log(`\nData to fill:`);
      console.log(`- Commodity Code: ${timestamp}`);
      console.log(`- Product Name: ${productName}`);
      console.log(`- Price: 1`);
      
      // Fill each field slowly
      await page.evaluate(async (data) => {
        const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
        
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const name = (input.name || input.id || input.placeholder || '').toLowerCase();
          
          // Flash the field
          input.style.backgroundColor = '#ffff00';
          await new Promise(r => setTimeout(r, 500));
          
          // Fill based on field type
          if (name.includes('code') || i === 0) {
            input.value = data.timestamp;
            console.log(`Filled field ${i} (${name}) with code: ${data.timestamp}`);
          } else if (name.includes('name') && !name.includes('supplier')) {
            input.value = data.productName;
            console.log(`Filled field ${i} (${name}) with name: ${data.productName}`);
          } else if (name.includes('price') || input.type === 'number') {
            input.value = '1';
            console.log(`Filled field ${i} (${name}) with price: 1`);
          } else {
            input.value = data.productName;
            console.log(`Filled field ${i} (${name}) with default: ${data.productName}`);
          }
          
          // Trigger events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Reset background
          input.style.backgroundColor = '#e6f3ff';
          await new Promise(r => setTimeout(r, 500));
        }
      }, { timestamp: String(timestamp), productName });
      
      console.log('✓ Form filled!\n');
      
      // Highlight save button
      console.log('=== STEP 7: LOOKING FOR SAVE BUTTON ===');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
        const saveBtn = buttons.find(btn => {
          const text = (btn.textContent || btn.value || '').toLowerCase();
          return text.includes('save') || text.includes('submit') || text.includes('ok') || text.includes('confirm');
        });
        
        if (saveBtn) {
          saveBtn.style.border = '5px solid lime';
          saveBtn.style.backgroundColor = '#00ff00';
          saveBtn.style.fontSize = '20px';
          console.log('Save button found and highlighted in GREEN');
        }
      });
    } else {
      console.log('\n⚠️ No form fields found. The Add button click might not have worked.');
    }
    
    await page.screenshot({ path: `screenshots/final_state_${getTimestamp()}.png` });
    
    console.log('\n=== COMPLETE ===');
    console.log('Check if the form is filled and save button is highlighted.');
    console.log('Browser remains open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

addCommoditySlow().catch(console.error);