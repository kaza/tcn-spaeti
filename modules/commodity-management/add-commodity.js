const { chromium } = require('playwright');
const { login } = require('../common/login');

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

async function navigateToCommodityInfo(page) {
  // Click Commodity management in sidebar
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
  
  // Navigate to Commodity info
  await page.evaluate(() => {
    if (typeof SetMenuLinkUrl === 'function') {
      SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false);
    }
  });
  
  await page.waitForTimeout(5000);
  console.log('✓ Navigated to Commodity Info');
}

async function addCommodity(commodityData = {}) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await login(page);
    
    // Navigate
    await navigateToCommodityInfo(page);
    
    // Wait for iframe
    await page.waitForSelector('iframe[id="54"], iframe[src*="CommodityInfo"]', { timeout: 10000 });
    
    // Get the commodity iframe
    const commodityFrame = page.frames().find(frame => 
      frame.url().includes('CommodityInfo/Index')
    );
    
    if (!commodityFrame) {
      throw new Error('Could not find Commodity Info iframe');
    }
    
    // Click Add button
    await commodityFrame.waitForSelector('a[onclick*="Modal_User"]', { timeout: 5000 });
    await commodityFrame.click('a[onclick*="Modal_User"]');
    console.log('✓ Clicked Add button');
    
    await commodityFrame.waitForTimeout(3000);
    
    // Prepare data
    const timestamp = getUnixTimestamp();
    const defaultData = {
      code: String(timestamp),
      name: `dummy${timestamp}`,
      specs: `dummy${timestamp}`,
      unitPrice: '1',
      costPrice: '1'
    };
    
    const data = { ...defaultData, ...commodityData };
    
    // Fill form
    const formFilled = await commodityFrame.evaluate((data) => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
      
      if (inputs.length === 0) return false;
      
      inputs.forEach((input) => {
        const placeholder = input.placeholder || '';
        
        if (placeholder.includes('barcode') || placeholder.includes('Commodity code')) {
          input.value = data.code;
        } else if (placeholder.includes('product name') || placeholder.includes('Product name')) {
          input.value = data.name;
        } else if (placeholder.includes('specification') || placeholder.includes('Specs')) {
          input.value = data.specs;
        } else if (placeholder.includes('unit price') || placeholder.includes('Unit price')) {
          input.value = data.unitPrice;
        } else if (placeholder.includes('purchasing price') || placeholder.includes('Cost price')) {
          input.value = data.costPrice;
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
      
      return true;
    }, data);
    
    if (formFilled) {
      console.log('\n✅ Commodity form filled:');
      console.log(`Code: ${data.code}`);
      console.log(`Name: ${data.name}`);
      console.log(`Specs: ${data.specs}`);
      console.log(`Unit Price: ${data.unitPrice}`);
      console.log(`Cost Price: ${data.costPrice}`);
      
      await page.screenshot({ 
        path: `screenshots/commodity_added_${getTimestamp()}.png`,
        fullPage: true 
      });
    }
    
    return { success: true, data, browser, page };
    
  } catch (error) {
    console.error('Error adding commodity:', error);
    await browser.close();
    throw error;
  }
}

module.exports = { addCommodity, navigateToCommodityInfo };