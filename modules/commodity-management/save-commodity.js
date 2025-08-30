const { chromium } = require('playwright');
const { login } = require('../common/login');
const { addCommodity, navigateToCommodityInfo } = require('./add-commodity');

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

async function saveNewCommodity() {
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
      name: `Test Product ${timestamp}`,
      specs: `Test Specs ${timestamp}`,
      unitPrice: '5',
      costPrice: '3'
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
    
    // Check for image upload field
    console.log('\n=== CHECKING FOR IMAGE REQUIREMENTS ===');
    
    const imageInfo = await commodityFrame.evaluate(() => {
      // Look for file input
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      // Look for image-related text
      const pageText = document.body.textContent;
      const hasImageRequirement = pageText.includes('NFC设备图片') || 
                                 pageText.includes('图片格式') ||
                                 pageText.includes('image');
      
      // Check if there's any indication that image is required
      const requiredIndicators = document.querySelectorAll('[required], .required');
      
      return {
        fileInputCount: fileInputs.length,
        hasImageText: hasImageRequirement,
        fileInputDetails: Array.from(fileInputs).map(input => ({
          name: input.name,
          id: input.id,
          required: input.required,
          accept: input.accept
        }))
      };
    });
    
    console.log('File inputs found:', imageInfo.fileInputCount);
    console.log('Has image-related text:', imageInfo.hasImageText);
    if (imageInfo.fileInputCount > 0) {
      console.log('File input details:', imageInfo.fileInputDetails);
    }
    
    // Try to save without image first
    console.log('\n=== ATTEMPTING TO SAVE ===');
    
    const saveResult = await commodityFrame.evaluate(() => {
      // Find save button
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const saveBtn = buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        return text.includes('save') || text.includes('submit') || 
               text.includes('ok') || text.includes('confirm') ||
               text.includes('保存') || text.includes('确定');
      });
      
      if (saveBtn) {
        console.log('Found save button:', saveBtn.textContent || saveBtn.value);
        saveBtn.style.border = '5px solid red';
        saveBtn.click();
        return true;
      }
      
      return false;
    });
    
    if (saveResult) {
      console.log('✓ Clicked Save button');
      
      // Wait for response
      await commodityFrame.waitForTimeout(3000);
      
      // Check for error messages or success
      const result = await commodityFrame.evaluate(() => {
        // Common error message selectors
        const errorSelectors = ['.error', '.alert-danger', '.error-message', '[class*="error"]'];
        const successSelectors = ['.success', '.alert-success', '[class*="success"]'];
        
        let errors = [];
        let success = [];
        
        errorSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.textContent.trim()) {
              errors.push(el.textContent.trim());
            }
          });
        });
        
        successSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.textContent.trim()) {
              success.push(el.textContent.trim());
            }
          });
        });
        
        // Check if modal is still open
        const modalStillOpen = document.querySelector('.modal.show, .modal[style*="display: block"]') !== null;
        
        return {
          errors: errors,
          success: success,
          modalStillOpen: modalStillOpen,
          pageText: document.body.textContent.substring(0, 500)
        };
      });
      
      console.log('\n=== SAVE RESULT ===');
      if (result.errors.length > 0) {
        console.log('❌ Errors found:', result.errors);
      }
      if (result.success.length > 0) {
        console.log('✅ Success messages:', result.success);
      }
      console.log('Modal still open:', result.modalStillOpen);
      
      if (result.modalStillOpen && result.errors.length === 0) {
        console.log('\n⚠️  Modal is still open. Image might be required.');
        console.log('The form mentions:');
        console.log('- Image format: jpg, png');
        console.log('- Image size: 15k');
        console.log('- Background: white or transparent recommended');
        console.log('- If not approved, image won\'t show but product will still be listed');
      }
    }
    
    await page.screenshot({ 
      path: `screenshots/save_attempt_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Screenshot saved');
    console.log('Check the browser to see if product was saved or if image is required.');
    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

saveNewCommodity().catch(console.error);