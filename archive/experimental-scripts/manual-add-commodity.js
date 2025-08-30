const { chromium } = require('playwright');

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

async function manualAddCommodity() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  try {
    const page = await browser.newPage();
    
    // Login
    console.log('Logging in...');
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
    
    // Navigate to Commodity Info
    console.log('Navigating to Commodity Info...');
    
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const commoditySpan = spans.find(span => 
        span.textContent?.includes('Commodity management')
      );
      if (commoditySpan) {
        commoditySpan.click();
        if (commoditySpan.parentElement) commoditySpan.parentElement.click();
      }
    });
    
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      if (typeof SetMenuLinkUrl === 'function') {
        SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false);
      }
    });
    
    await page.waitForTimeout(5000);
    
    console.log('\n==================================================');
    console.log('NOW YOU CAN DO THE FOLLOWING:');
    console.log('==================================================\n');
    
    console.log('1. OPEN BROWSER CONSOLE (F12 or Right Click -> Inspect -> Console)\n');
    
    console.log('2. TYPE THIS TO OPEN ADD FORM:');
    console.log('   Modal_User("Add")\n');
    
    console.log('3. OR JUST CLICK THE ADD BUTTON MANUALLY\n');
    
    console.log('4. ONCE THE FORM IS OPEN, COME BACK HERE AND PRESS ENTER');
    console.log('   The script will then fill the form automatically\n');
    
    console.log('Press ENTER when the Add form is open...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Now fill the form
    console.log('\nFilling the form...');
    const timestamp = getUnixTimestamp();
    const productName = `dummy${timestamp}`;
    
    const filled = await page.evaluate((data) => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly]), textarea');
      console.log(`Found ${inputs.length} input fields to fill`);
      
      if (inputs.length === 0) {
        return false;
      }
      
      inputs.forEach((input, index) => {
        const name = (input.name || input.id || input.placeholder || '').toLowerCase();
        
        if (name.includes('code') || index === 0) {
          input.value = data.timestamp;
        } else if (name.includes('name') && !name.includes('supplier')) {
          input.value = data.productName;
        } else if (name.includes('spec')) {
          input.value = data.productName;
        } else if (name.includes('price') || input.type === 'number') {
          input.value = '1';
        } else {
          input.value = data.productName;
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // Handle dropdowns
      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        if (select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Highlight save button
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const saveBtn = buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        return text.includes('save') || text.includes('submit') || text.includes('ok') || text.includes('confirm');
      });
      
      if (saveBtn) {
        saveBtn.style.border = '5px solid lime';
        saveBtn.style.backgroundColor = 'yellow';
      }
      
      return true;
    }, { timestamp: String(timestamp), productName });
    
    if (filled) {
      console.log('\n✓ Form filled successfully!');
      console.log(`Commodity Code: ${timestamp}`);
      console.log(`Product Name: ${productName}`);
      console.log('\nThe SAVE button should be highlighted in GREEN/YELLOW');
      console.log('You can click it to save the product.');
    } else {
      console.log('\n✗ No form fields found. Make sure the Add modal is open.');
    }
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Enable stdin for user input
process.stdin.setRawMode(true);
process.stdin.resume();

manualAddCommodity().catch(console.error);