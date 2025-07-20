const { chromium } = require('playwright');

// Helper function to generate timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

// Get Unix timestamp for commodity code
const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

async function stepByStepCommodity() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 2000 // Very slow so you can see everything
  });

  try {
    const page = await browser.newPage();
    
    // STEP 1: LOGIN
    console.log('\n========== STEP 1: NAVIGATING TO LOGIN PAGE ==========');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `screenshots/step1_login_page_${getTimestamp()}.png` });
    console.log('✓ Screenshot saved: step1_login_page');

    // STEP 2: FILL CREDENTIALS
    console.log('\n========== STEP 2: FILLING USERNAME AND PASSWORD ==========');
    await page.fill('#userName', 'Spaetitogo');
    await page.fill('#passWord', 'Zebra1234!');
    await page.screenshot({ path: `screenshots/step2_credentials_filled_${getTimestamp()}.png` });
    console.log('✓ Screenshot saved: step2_credentials_filled');

    // STEP 3: CLICK LOGIN
    console.log('\n========== STEP 3: CLICKING LOGIN BUTTON ==========');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input'));
      const loginBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('sign') || 
        btn.textContent.toLowerCase().includes('login')
      );
      if (loginBtn) {
        console.log('Found login button:', loginBtn.textContent);
        loginBtn.click();
      }
    });
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `screenshots/step3_after_login_${getTimestamp()}.png` });
    console.log('✓ Screenshot saved: step3_after_login');
    console.log('Current URL:', page.url());

    // STEP 4: FIND COMMODITY MANAGEMENT
    console.log('\n========== STEP 4: LOOKING FOR COMMODITY MANAGEMENT ==========');
    console.log('Searching in left navigation menu...');
    
    const found = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a, li, div, span'));
      console.log(`Total elements to check: ${elements.length}`);
      
      const commodity = elements.find(el => {
        const text = el.textContent || '';
        if (text.includes('Commodity management')) {
          console.log(`Found: ${el.tagName} with text "${text.trim()}"`);
          return true;
        }
        return false;
      });
      
      if (commodity) {
        commodity.style.border = '3px solid red';
        return true;
      }
      return false;
    });
    
    await page.screenshot({ path: `screenshots/step4_commodity_highlighted_${getTimestamp()}.png` });
    console.log('✓ Screenshot saved: step4_commodity_highlighted');
    
    if (found) {
      console.log('\n⚡ ABOUT TO CLICK COMMODITY MANAGEMENT ⚡');
      console.log('Clicking in 3 seconds...');
      await page.waitForTimeout(3000);
      
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, li, div, span'));
        const commodity = elements.find(el => el.textContent?.includes('Commodity management'));
        if (commodity) commodity.click();
      });
      
      console.log('✓ Clicked!');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/step4_after_commodity_click_${getTimestamp()}.png` });
    }

    // STEP 5: FIND COMMODITY INFO
    console.log('\n========== STEP 5: LOOKING FOR COMMODITY INFO ==========');
    
    const infoFound = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a, li, div, span'));
      const info = elements.find(el => {
        const text = el.textContent || '';
        if (text.includes('Commodity info')) {
          console.log(`Found: ${el.tagName} with text "${text.trim()}"`);
          el.style.border = '3px solid blue';
          return true;
        }
        return false;
      });
      return !!info;
    });
    
    await page.screenshot({ path: `screenshots/step5_commodity_info_highlighted_${getTimestamp()}.png` });
    
    if (infoFound) {
      console.log('\n⚡ ABOUT TO CLICK COMMODITY INFO ⚡');
      console.log('Clicking in 3 seconds...');
      await page.waitForTimeout(3000);
      
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, li, div, span'));
        const info = elements.find(el => el.textContent?.includes('Commodity info'));
        if (info) info.click();
      });
      
      console.log('✓ Clicked!');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/step5_after_info_click_${getTimestamp()}.png` });
    }

    // STEP 6: FIND ADD BUTTON
    console.log('\n========== STEP 6: LOOKING FOR ADD/NEW BUTTON ==========');
    
    const addFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
      const addBtn = buttons.find(btn => {
        const text = btn.textContent || btn.value || '';
        if (text.includes('Add') || text.includes('New') || text.includes('新增')) {
          console.log(`Found: ${btn.tagName} with text "${text.trim()}"`);
          btn.style.border = '3px solid green';
          return true;
        }
        return false;
      });
      return !!addBtn;
    });
    
    await page.screenshot({ path: `screenshots/step6_add_button_highlighted_${getTimestamp()}.png` });
    
    if (addFound) {
      console.log('\n⚡ ABOUT TO CLICK ADD BUTTON ⚡');
      console.log('Clicking in 3 seconds...');
      await page.waitForTimeout(3000);
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
        const addBtn = buttons.find(btn => {
          const text = btn.textContent || btn.value || '';
          return text.includes('Add') || text.includes('New') || text.includes('新增');
        });
        if (addBtn) addBtn.click();
      });
      
      console.log('✓ Clicked!');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/step6_after_add_click_${getTimestamp()}.png` });
    }

    // STEP 7: FILL FORM
    console.log('\n========== STEP 7: FILLING FORM FIELDS ==========');
    const timestamp = getUnixTimestamp();
    const productName = `dummy${timestamp}`;
    
    console.log(`Commodity Code: ${timestamp}`);
    console.log(`Product Name: ${productName}`);
    
    await page.evaluate((data) => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
      console.log(`Found ${inputs.length} input fields`);
      
      inputs.forEach((input, index) => {
        const label = input.placeholder || input.name || input.id || `field${index}`;
        console.log(`Field ${index}: ${label}`);
        
        // Highlight each field
        input.style.border = '2px solid orange';
        
        // Fill based on field type
        if (label.toLowerCase().includes('code')) {
          input.value = data.timestamp;
        } else if (label.toLowerCase().includes('name')) {
          input.value = data.productName;
        } else if (label.toLowerCase().includes('price')) {
          input.value = '1';
        } else {
          input.value = data.productName; // Default value
        }
      });
    }, { timestamp: String(timestamp), productName });
    
    await page.screenshot({ path: `screenshots/step7_form_filled_${getTimestamp()}.png` });
    console.log('✓ Screenshot saved: step7_form_filled');

    // STEP 8: FIND SAVE BUTTON
    console.log('\n========== STEP 8: LOOKING FOR SAVE BUTTON ==========');
    
    const saveFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
      const saveBtn = buttons.find(btn => {
        const text = btn.textContent || btn.value || '';
        if (text.includes('Save') || text.includes('Submit') || text.includes('保存')) {
          console.log(`Found save button: ${btn.tagName} with text "${text.trim()}"`);
          btn.style.border = '5px solid red';
          btn.style.backgroundColor = 'yellow';
          return true;
        }
        return false;
      });
      return !!saveBtn;
    });
    
    await page.screenshot({ path: `screenshots/step8_save_button_highlighted_${getTimestamp()}.png` });
    
    if (saveFound) {
      console.log('\n⚠️  SAVE BUTTON FOUND AND HIGHLIGHTED IN RED ⚠️');
      console.log('The script will NOT click it automatically.');
      console.log('YOU can click it manually if you want to save.');
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`Commodity Code: ${timestamp}`);
    console.log(`Product Name: ${productName}`);
    console.log('All screenshots saved in screenshots/ folder');
    console.log('\nBrowser will remain open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: `screenshots/error_${getTimestamp()}.png` });
    await browser.close();
  }
}

stepByStepCommodity().catch(console.error);