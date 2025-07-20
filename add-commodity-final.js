const { chromium } = require('playwright');

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);
const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

async function addCommodityFinal() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
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
    
    console.log('Waiting for iframe to load...');
    await page.waitForTimeout(5000);
    console.log('✓ Navigated to Commodity Info\n');
    
    // Find the correct iframe
    console.log('=== STEP 3: FINDING COMMODITY INFO IFRAME ===');
    
    // Wait for the iframe to appear
    await page.waitForSelector('iframe[id="54"], iframe[src*="CommodityInfo"]', { timeout: 10000 });
    
    // Get the iframe
    const commodityFrame = page.frames().find(frame => 
      frame.url().includes('CommodityInfo/Index')
    );
    
    if (!commodityFrame) {
      throw new Error('Could not find Commodity Info iframe');
    }
    
    console.log('✓ Found Commodity Info iframe\n');
    
    // Click Add button in the iframe
    console.log('=== STEP 4: CLICKING ADD BUTTON ===');
    
    // Wait for Add button to appear in iframe
    await commodityFrame.waitForSelector('a[onclick*="Modal_User"]', { timeout: 5000 });
    
    // Click it
    await commodityFrame.click('a[onclick*="Modal_User"]');
    console.log('✓ Clicked Add button\n');
    
    // Wait for modal to appear
    console.log('=== STEP 5: WAITING FOR FORM ===');
    await commodityFrame.waitForTimeout(3000);
    
    // Fill the form - the modal should be in the same iframe
    console.log('=== STEP 6: FILLING FORM ===');
    const timestamp = getUnixTimestamp();
    const productName = `dummy${timestamp}`;
    
    const formFilled = await commodityFrame.evaluate((data) => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
      
      if (inputs.length === 0) {
        return false;
      }
      
      console.log(`Found ${inputs.length} input fields`);
      
      inputs.forEach((input, index) => {
        const placeholder = input.placeholder || '';
        const name = (input.name || input.id || '').toLowerCase();
        
        // Highlight field being filled
        input.style.backgroundColor = '#90EE90';
        
        // Fill based on placeholder text (from your message)
        if (placeholder.includes('barcode') || placeholder.includes('Commodity code') || index === 0) {
          input.value = data.timestamp;
          console.log(`Filled commodity code: ${data.timestamp}`);
        } else if (placeholder.includes('product name') || placeholder.includes('Product name')) {
          input.value = data.productName;
          console.log(`Filled product name: ${data.productName}`);
        } else if (placeholder.includes('specification') || placeholder.includes('Specs')) {
          input.value = data.productName;
          console.log(`Filled specs: ${data.productName}`);
        } else if (placeholder.includes('unit price') || placeholder.includes('Unit price')) {
          input.value = '1';
          console.log('Filled unit price: 1');
        } else if (placeholder.includes('purchasing price') || placeholder.includes('Cost price')) {
          input.value = '1';
          console.log('Filled cost price: 1');
        }
        
        // Trigger events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // Handle dropdowns (Supplier, Type)
      const selects = document.querySelectorAll('select');
      selects.forEach((select, index) => {
        if (select.options.length > 1) {
          select.selectedIndex = 1; // Select first real option
          select.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`Selected first option in dropdown ${index}`);
        }
      });
      
      // Find and highlight save button
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const saveBtn = buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        return text.includes('save') || text.includes('submit') || text.includes('ok') || text.includes('confirm');
      });
      
      if (saveBtn) {
        saveBtn.style.border = '5px solid lime';
        saveBtn.style.backgroundColor = 'yellow';
        saveBtn.style.fontSize = '20px';
        console.log('Save button highlighted');
      }
      
      return true;
    }, { timestamp: String(timestamp), productName });
    
    if (formFilled) {
      console.log(`\n✅ Form filled successfully!`);
      console.log(`Commodity Code: ${timestamp}`);
      console.log(`Product Name: ${productName}`);
      console.log(`Specs: ${productName}`);
      console.log(`Unit Price: 1`);
      console.log(`Cost Price: 1`);
      console.log(`\n✓ Save button should be highlighted in GREEN/YELLOW`);
      
      await page.screenshot({ path: `screenshots/commodity_form_complete_${getTimestamp()}.png` });
      console.log('✓ Screenshot saved');
    } else {
      console.log('❌ Could not fill form - no input fields found');
    }
    
    console.log('\n=== COMPLETE ===');
    console.log('You can now click the Save button to add the product.');
    console.log('Browser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

addCommodityFinal().catch(console.error);