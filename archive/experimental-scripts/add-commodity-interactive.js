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

async function loginAndAddCommodity() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slower so you can observe
  });

  try {
    const page = await browser.newPage();
    
    // First, login
    console.log('Navigating to login page...');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    await page.waitForTimeout(3000);

    console.log('Logging in...');
    await page.fill('#userName', 'Spaetitogo');
    await page.fill('#passWord', 'Zebra1234!');

    // Click login
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
      const signInButton = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('sign') || 
        btn.textContent.toLowerCase().includes('login') ||
        btn.textContent.includes('登录')
      );
      
      if (signInButton) {
        signInButton.click();
      }
    });

    console.log('Waiting for dashboard...');
    await page.waitForTimeout(5000);

    // Look for Commodity management in left navigation
    console.log('Looking for Commodity management in left navigation...');
    
    // Try to click Commodity management
    const commodityClicked = await page.evaluate(() => {
      // Look for any clickable element with "Commodity management"
      const allElements = Array.from(document.querySelectorAll('a, li, div, span, button'));
      const commodityElement = allElements.find(el => {
        const text = el.textContent || '';
        return text.includes('Commodity management') && text.length < 100; // Avoid big containers
      });
      
      if (commodityElement) {
        console.log('Found Commodity management:', commodityElement.tagName, commodityElement.className);
        commodityElement.click();
        return true;
      }
      
      console.log('Commodity management not found');
      return false;
    });

    if (!commodityClicked) {
      console.log('Could not find Commodity management, trying to click any menu items...');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: `screenshots/after_commodity_click_${getTimestamp()}.png` });

    // Look for Commodity info
    console.log('Looking for Commodity info submenu...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a, li, div[onclick], span[onclick]'));
      const infoElement = elements.find(el => 
        el.textContent.includes('Commodity info') || 
        el.textContent.includes('商品信息')
      );
      
      if (infoElement) {
        console.log('Clicking Commodity info:', infoElement.tagName);
        infoElement.click();
      }
    });

    await page.waitForTimeout(3000);
    await page.screenshot({ path: `screenshots/commodity_info_page_${getTimestamp()}.png` });

    // Click Add/New button
    console.log('Clicking Add/New button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], div[onclick]'));
      const addButton = buttons.find(btn => 
        btn.textContent.includes('Add') || 
        btn.textContent.includes('New') ||
        btn.textContent.includes('新增') ||
        btn.textContent.includes('添加')
      );
      
      if (addButton) {
        console.log('Clicking Add button:', addButton.textContent);
        addButton.click();
      }
    });

    await page.waitForTimeout(3000);

    // Fill the form
    console.log('Filling all form fields...');
    
    const timestamp = getUnixTimestamp();
    const productName = `dummy${timestamp}`;
    
    // Fill all input fields
    await page.evaluate((data) => {
      // Fill all text inputs
      const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
      console.log(`Found ${inputs.length} input fields`);
      
      inputs.forEach((input, index) => {
        const name = input.name || input.id || input.placeholder || '';
        console.log(`Field ${index}: ${name}`);
        
        if (name.toLowerCase().includes('code')) {
          input.value = data.timestamp;
        } else if (name.toLowerCase().includes('name')) {
          input.value = data.productName;
        } else if (name.toLowerCase().includes('spec')) {
          input.value = data.productName;
        } else if (name.toLowerCase().includes('price')) {
          input.value = '1';
        } else if (input.type === 'number') {
          input.value = '1';
        } else {
          // Fill with some default value
          input.value = data.productName;
        }
        
        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      
      // Select first option in all dropdowns
      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        if (select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, { timestamp: String(timestamp), productName });

    await page.screenshot({ path: `screenshots/form_filled_${getTimestamp()}.png` });

    // Try to upload dummy4.jpg
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      console.log('Uploading dummy4.jpg...');
      try {
        await fileInputs[0].setInputFiles('dummy4.jpg');
      } catch (error) {
        console.log('Image upload failed:', error.message);
      }
    }

    // Find and click Save button
    console.log('Looking for Save/Submit button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
      const saveButton = buttons.find(btn => {
        const text = btn.textContent || btn.value || '';
        return text.includes('Save') || 
               text.includes('Submit') ||
               text.includes('保存') ||
               text.includes('提交') ||
               text.includes('OK');
      });
      
      if (saveButton) {
        console.log('FOUND SAVE BUTTON:', saveButton.textContent || saveButton.value);
        saveButton.style.border = '3px solid red'; // Highlight it
        saveButton.click(); // Click it!
      } else {
        console.log('No save button found');
      }
    });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `screenshots/after_save_${getTimestamp()}.png` });

    console.log('===================');
    console.log(`Commodity code: ${timestamp}`);
    console.log(`Product name: ${productName}`);
    console.log('===================');
    console.log('Check if the product was saved successfully!');
    console.log('Browser will remain open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

loginAndAddCommodity().catch(console.error);