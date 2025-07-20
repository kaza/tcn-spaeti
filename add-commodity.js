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
    slowMo: 500
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

    // Screenshot before login
    await page.screenshot({ 
      path: `screenshots/commodity_login_before_${getTimestamp()}.png`,
      fullPage: true 
    });

    console.log('Logging in...');
    await page.fill('#userName', 'Spaetitogo');
    await page.fill('#passWord', 'Zebra1234!');

    // Click login using JavaScript
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

    // Screenshot after login
    await page.screenshot({ 
      path: `screenshots/commodity_dashboard_${getTimestamp()}.png`,
      fullPage: true 
    });

    // Navigate to Commodity management
    console.log('Looking for Home menu...');
    
    // Try clicking Home first
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, div[onclick], span[onclick]'));
      const homeLink = links.find(link => 
        link.textContent.includes('Home') || 
        link.textContent.includes('首页')
      );
      if (homeLink) {
        console.log('Found Home link:', homeLink.textContent);
        homeLink.click();
      }
    });

    await page.waitForTimeout(2000);

    // Look for Commodity management
    console.log('Looking for Commodity management...');
    
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, div[onclick], span[onclick], li'));
      const commodityLink = links.find(link => 
        link.textContent.includes('Commodity management') || 
        link.textContent.includes('商品管理') ||
        link.textContent.includes('Product management')
      );
      if (commodityLink) {
        console.log('Found Commodity management:', commodityLink.textContent);
        commodityLink.click();
      }
    });

    await page.waitForTimeout(2000);

    // Screenshot navigation menu
    await page.screenshot({ 
      path: `screenshots/commodity_navigation_${getTimestamp()}.png`,
      fullPage: true 
    });

    // Look for Commodity info submenu
    console.log('Looking for Commodity info...');
    
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, div[onclick], span[onclick], li'));
      const infoLink = links.find(link => 
        link.textContent.includes('Commodity info') || 
        link.textContent.includes('商品信息') ||
        link.textContent.includes('Product info')
      );
      if (infoLink) {
        console.log('Found Commodity info:', infoLink.textContent);
        infoLink.click();
      }
    });

    await page.waitForTimeout(3000);

    // Screenshot commodity info page
    await page.screenshot({ 
      path: `screenshots/commodity_info_page_${getTimestamp()}.png`,
      fullPage: true 
    });

    // Look for Add/New button
    console.log('Looking for Add New button...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], div[onclick]'));
      const addButton = buttons.find(btn => 
        btn.textContent.includes('Add') || 
        btn.textContent.includes('New') ||
        btn.textContent.includes('新增') ||
        btn.textContent.includes('添加') ||
        btn.classList.contains('add') ||
        btn.classList.contains('btn-add')
      );
      if (addButton) {
        console.log('Found Add button:', addButton.textContent);
        addButton.click();
      }
    });

    await page.waitForTimeout(3000);

    // Screenshot add form
    await page.screenshot({ 
      path: `screenshots/commodity_add_form_before_${getTimestamp()}.png`,
      fullPage: true 
    });

    // Fill the form
    console.log('Filling commodity form...');
    
    const timestamp = getUnixTimestamp();
    const productName = `dummy${timestamp}`;
    
    // Try to fill form fields - these selectors may need adjustment
    try {
      // Commodity code
      const codeInputs = await page.$$('input[name*="code"], input[id*="code"], input[placeholder*="code"]');
      if (codeInputs.length > 0) {
        await codeInputs[0].fill(String(timestamp));
      }

      // Product name
      const nameInputs = await page.$$('input[name*="name"], input[id*="name"], input[placeholder*="name"]');
      if (nameInputs.length > 0) {
        await nameInputs[0].fill(productName);
      }

      // Specs - repeat product name
      const specInputs = await page.$$('input[name*="spec"], input[id*="spec"], input[placeholder*="spec"]');
      if (specInputs.length > 0) {
        await specInputs[0].fill(productName);
      }

      // Price
      const priceInputs = await page.$$('input[name*="price"], input[id*="price"], input[placeholder*="price"], input[type="number"]');
      if (priceInputs.length > 0) {
        await priceInputs[0].fill('1');
      }

      // Type - select first option (beverages)
      const typeSelects = await page.$$('select[name*="type"], select[id*="type"], select[name*="category"]');
      if (typeSelects.length > 0) {
        await typeSelects[0].selectOption({ index: 1 }); // First option after placeholder
      }

    } catch (error) {
      console.log('Error filling form fields:', error.message);
    }

    // Screenshot after filling
    await page.screenshot({ 
      path: `screenshots/commodity_add_form_filled_${getTimestamp()}.png`,
      fullPage: true 
    });

    // Try to upload image if required
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      console.log('Found file input, attempting to upload dummy4.jpg...');
      // Note: You'll need to have dummy4.jpg in the project root
      try {
        await fileInputs[0].setInputFiles('dummy4.jpg');
      } catch (error) {
        console.log('Could not upload image:', error.message);
      }
    }

    // Look for Save/Submit button
    console.log('Looking for Save button...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
      const saveButton = buttons.find(btn => 
        btn.textContent.includes('Save') || 
        btn.textContent.includes('Submit') ||
        btn.textContent.includes('保存') ||
        btn.textContent.includes('提交') ||
        btn.classList.contains('save') ||
        btn.classList.contains('submit')
      );
      if (saveButton) {
        console.log('Found Save button:', saveButton.textContent);
        // Don't click yet - just log
        console.log('Would click:', saveButton);
      }
    });

    // Final screenshot
    await page.screenshot({ 
      path: `screenshots/commodity_ready_to_save_${getTimestamp()}.png`,
      fullPage: true 
    });

    console.log(`Commodity code: ${timestamp}`);
    console.log(`Product name: ${productName}`);
    console.log('Form filled and ready. Check screenshots to verify before saving.');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Error screenshot
    await page.screenshot({ 
      path: `screenshots/commodity_error_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    await browser.close();
  }
}

loginAndAddCommodity().catch(console.error);