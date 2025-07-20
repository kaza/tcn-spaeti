const { chromium } = require('playwright');

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

async function simpleAdd() {
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
    console.log('✓ On Commodity Info page\n');
    
    console.log('==================================================');
    console.log('MANUAL STEPS:');
    console.log('==================================================\n');
    
    console.log('1. Click the Add button manually\n');
    
    console.log('2. OR open browser console (F12) and type:');
    console.log('   Modal_User("Add")\n');
    
    console.log('3. Wait 10 seconds and the form will auto-fill\n');
    
    // Wait 10 seconds then try to fill
    console.log('Waiting 10 seconds before attempting to fill form...');
    await page.waitForTimeout(10000);
    
    // Try to fill the form
    console.log('\nAttempting to fill form...');
    const timestamp = getUnixTimestamp();
    const productName = `dummy${timestamp}`;
    
    const result = await page.evaluate((data) => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly]), textarea');
      
      if (inputs.length === 0) {
        return { success: false, message: 'No input fields found' };
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
      
      // Dropdowns
      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        if (select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Highlight save
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const saveBtn = buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        return text.includes('save') || text.includes('submit') || text.includes('ok');
      });
      
      if (saveBtn) {
        saveBtn.style.border = '5px solid lime';
        saveBtn.style.backgroundColor = 'yellow';
      }
      
      return { success: true, fieldCount: inputs.length };
    }, { timestamp: String(timestamp), productName });
    
    if (result.success) {
      console.log(`\n✓ Filled ${result.fieldCount} fields!`);
      console.log(`Commodity Code: ${timestamp}`);
      console.log(`Product Name: ${productName}`);
      console.log('\nSave button should be highlighted.');
    } else {
      console.log('\n✗ ' + result.message);
      console.log('Make sure you opened the Add form first!');
    }
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

simpleAdd().catch(console.error);