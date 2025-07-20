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

async function saveWithImage() {
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
    
    // Fill form
    const timestamp = getUnixTimestamp();
    const data = {
      code: String(timestamp),
      name: `Product with Image ${timestamp}`,
      specs: `Specs ${timestamp}`,
      unitPrice: '10',
      costPrice: '5'
    };
    
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
    
    console.log('✓ Form filled');
    console.log(`Product: ${data.name}`);
    
    // Upload image BEFORE clicking save
    console.log('\n=== UPLOADING IMAGE ===');
    
    // Find the image input field
    const imageInput = await commodityFrame.$('input[type="file"][name="WMPImg1"], input[type="file"]:first-of-type');
    
    if (imageInput) {
      const imagePath = path.join(__dirname, '../../dummy4.jpg');
      console.log(`Uploading image from: ${imagePath}`);
      
      await imageInput.setInputFiles(imagePath);
      console.log('✓ Image selected');
      
      await commodityFrame.waitForTimeout(2000);
    } else {
      console.log('⚠️  Could not find image input field');
    }
    
    // Now click the Submit button with id="cropsuccess"
    console.log('\n=== CLICKING SUBMIT BUTTON ===');
    
    // First try to find and click the specific submit button
    const submitClicked = await commodityFrame.evaluate(() => {
      // Look for the specific button with id="cropsuccess"
      const cropSuccessBtn = document.getElementById('cropsuccess');
      
      if (cropSuccessBtn) {
        console.log('Found Submit button with id="cropsuccess"');
        cropSuccessBtn.style.border = '5px solid lime';
        cropSuccessBtn.style.backgroundColor = 'yellow';
        cropSuccessBtn.click();
        return true;
      }
      
      // Fallback: find submit button by text
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn => {
        const text = (btn.textContent || '').trim();
        return text === 'Submit' && btn.getAttribute('data-dismiss') === 'modal';
      });
      
      if (submitBtn) {
        console.log('Found Submit button by text');
        submitBtn.style.border = '5px solid lime';
        submitBtn.click();
        return true;
      }
      
      return false;
    });
    
    if (submitClicked) {
      console.log('✓ Clicked Submit button (crop confirmation)');
      
      // Wait for crop to be processed
      console.log('Waiting for crop confirmation...');
      await commodityFrame.waitForTimeout(3000);
      
      // Now click the final Submit button with onclick="Edit_CMT()"
      console.log('\n=== CLICKING FINAL SUBMIT BUTTON ===');
      
      const finalSubmitClicked = await commodityFrame.evaluate(() => {
        // Look for button with onclick="Edit_CMT()"
        const buttons = Array.from(document.querySelectorAll('button'));
        const editCMTButton = buttons.find(btn => {
          const onclick = btn.getAttribute('onclick') || '';
          return onclick.includes('Edit_CMT()');
        });
        
        if (editCMTButton) {
          console.log('Found final Submit button with Edit_CMT()');
          editCMTButton.style.border = '5px solid red';
          editCMTButton.style.backgroundColor = 'lime';
          editCMTButton.click();
          return true;
        }
        
        // Alternative: find by onclick attribute directly
        const directButton = document.querySelector('button[onclick="Edit_CMT()"]');
        if (directButton) {
          console.log('Found final Submit button directly');
          directButton.style.border = '5px solid red';
          directButton.click();
          return true;
        }
        
        return false;
      });
      
      if (finalSubmitClicked) {
        console.log('✓ Clicked final Submit button (Edit_CMT)');
        
        // Wait for save to complete
        console.log('Waiting for save to complete...');
        await commodityFrame.waitForTimeout(5000);
      } else {
        console.log('❌ Could not find final Submit button');
      }
      
      // Check result
      const saveStatus = await commodityFrame.evaluate(() => {
        // Check if modal closed
        const modalClosed = document.querySelector('.modal.show, .modal[style*="display: block"]') === null;
        
        // Look for success indicators
        const pageText = document.body.textContent;
        const hasSuccess = pageText.includes('success') || 
                          pageText.includes('成功') ||
                          pageText.includes('saved');
        
        // Check if we're back on the commodity list
        const onListPage = pageText.includes('Commodity code') && 
                          pageText.includes('Product name') &&
                          !pageText.includes('Please enter');
        
        return {
          modalClosed: modalClosed,
          hasSuccess: hasSuccess,
          onListPage: onListPage,
          currentUrl: window.location.href
        };
      });
      
      console.log('\n=== SAVE STATUS ===');
      console.log('Modal closed:', saveStatus.modalClosed);
      console.log('Success indicator found:', saveStatus.hasSuccess);
      console.log('Back on list page:', saveStatus.onListPage);
      
      if (saveStatus.modalClosed || saveStatus.onListPage) {
        console.log('\n✅ Product appears to be saved successfully!');
        
        // Try to find the new product in the list
        const newProduct = await commodityFrame.evaluate((code) => {
          const rows = document.querySelectorAll('tr');
          for (const row of rows) {
            if (row.textContent.includes(code)) {
              row.style.backgroundColor = 'yellow';
              return true;
            }
          }
          return false;
        }, data.code);
        
        if (newProduct) {
          console.log(`✅ Found new product in list with code: ${data.code}`);
          console.log('   (Highlighted in yellow)');
        }
      }
    } else {
      console.log('❌ Could not find Submit button for crop confirmation');
    }
    
    await page.screenshot({ 
      path: `screenshots/save_with_image_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Screenshot saved');
    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

saveWithImage().catch(console.error);