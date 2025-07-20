const { chromium } = require('playwright');
const path = require('path');
const { login } = require('../common/login');
const { navigateToCommodityInfo } = require('./add-commodity');

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

/**
 * Complete function to add a commodity with image
 * @param {Object} commodityData - Product details
 * @param {string} commodityData.code - Product barcode
 * @param {string} commodityData.name - Product name
 * @param {string} commodityData.specs - Product specifications
 * @param {string} commodityData.unitPrice - Selling price
 * @param {string} commodityData.costPrice - Purchase price
 * @param {string} imagePath - Path to product image (optional, uses dummy4.jpg by default)
 */
async function addCommodityComplete(commodityData = {}, imagePath = null) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Step 1: Login
    await login(page);
    
    // Step 2: Navigate to Commodity Info
    await navigateToCommodityInfo(page);
    
    // Step 3: Wait for iframe and switch context
    await page.waitForSelector('iframe[id="54"], iframe[src*="CommodityInfo"]', { timeout: 10000 });
    const commodityFrame = page.frames().find(frame => 
      frame.url().includes('CommodityInfo/Index')
    );
    
    if (!commodityFrame) {
      throw new Error('Could not find Commodity Info iframe');
    }
    
    // Step 4: Click Add button
    await commodityFrame.waitForSelector('a[onclick*="Modal_User"]', { timeout: 5000 });
    await commodityFrame.click('a[onclick*="Modal_User"]');
    console.log('✓ Opened Add Commodity form');
    
    await commodityFrame.waitForTimeout(3000);
    
    // Step 5: Prepare data with defaults
    const timestamp = getUnixTimestamp();
    const defaultData = {
      code: String(timestamp),
      name: `Product ${timestamp}`,
      specs: `Specs ${timestamp}`,
      unitPrice: '10',
      costPrice: '5'
    };
    
    const data = { ...defaultData, ...commodityData };
    
    // Step 6: Fill form
    await commodityFrame.evaluate((data) => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
      
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
    }, data);
    
    console.log('✓ Form filled with product data');
    
    // Step 7: Upload image
    const imageInput = await commodityFrame.$('input[type="file"][name="WMPImg1"], input[type="file"]:first-of-type');
    if (imageInput) {
      const imageToUpload = imagePath || path.join(__dirname, '../../dummy4.jpg');
      await imageInput.setInputFiles(imageToUpload);
      console.log('✓ Image uploaded');
    }
    
    await commodityFrame.waitForTimeout(2000);
    
    // Step 8: Click first Submit button (crop confirmation)
    const cropSubmitted = await commodityFrame.evaluate(() => {
      const cropSuccessBtn = document.getElementById('cropsuccess');
      if (cropSuccessBtn) {
        cropSuccessBtn.click();
        return true;
      }
      return false;
    });
    
    if (!cropSubmitted) {
      throw new Error('Could not find crop submit button');
    }
    
    console.log('✓ Image crop confirmed');
    await commodityFrame.waitForTimeout(3000);
    
    // Step 9: Click final Submit button (save commodity)
    const saved = await commodityFrame.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const editCMTButton = buttons.find(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        return onclick.includes('Edit_CMT()');
      });
      
      if (editCMTButton) {
        editCMTButton.click();
        return true;
      }
      return false;
    });
    
    if (!saved) {
      throw new Error('Could not find final submit button');
    }
    
    console.log('✓ Commodity saved');
    await commodityFrame.waitForTimeout(3000);
    
    // Step 10: Handle approval notification popup
    console.log('Checking for approval notification...');
    const approvalDismissed = await commodityFrame.evaluate(() => {
      // Look for submit button with data-dismiss="modal" in approval popup
      const buttons = Array.from(document.querySelectorAll('button[data-dismiss="modal"]'));
      const approvalButton = buttons.find(btn => {
        const text = (btn.textContent || '').trim();
        return text === 'Submit' && btn.className.includes('btn-success');
      });
      
      if (approvalButton) {
        console.log('Found approval notification submit button');
        approvalButton.click();
        return true;
      }
      return false;
    });
    
    if (approvalDismissed) {
      console.log('✓ Approval notification dismissed');
      console.log('  (Product will be reviewed and approved within a few days)');
    }
    
    await commodityFrame.waitForTimeout(3000);
    
    // Step 11: Verify product was added
    const productFound = await commodityFrame.evaluate((code) => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent.includes(code)) {
          row.style.backgroundColor = 'lightgreen';
          return true;
        }
      }
      return false;
    }, data.code);
    
    if (productFound) {
      console.log(`\n✅ SUCCESS! Product added with code: ${data.code}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Price: ${data.unitPrice}`);
    }
    
    await page.screenshot({ 
      path: `screenshots/commodity_added_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    return {
      success: true,
      data: data,
      browser: browser,
      page: page
    };
    
  } catch (error) {
    console.error('❌ Error adding commodity:', error.message);
    await browser.close();
    throw error;
  }
}

// Export the function
module.exports = { addCommodityComplete };

// If run directly, execute with test data
if (require.main === module) {
  addCommodityComplete({
    name: 'Coca Cola 330ml',
    specs: '330ml Can',
    unitPrice: '2.50',
    costPrice: '1.50'
  }).then(result => {
    console.log('\nPress Ctrl+C to exit...');
    return new Promise(() => {}); // Keep browser open
  }).catch(console.error);
}