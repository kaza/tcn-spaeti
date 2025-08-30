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

async function addCommodityFinalComplete() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await login(page);
    
    // Navigate to Commodity Info
    await navigateToCommodityInfo(page);
    
    // Wait for iframe
    await page.waitForSelector('iframe[id="54"], iframe[src*="CommodityInfo"]', { timeout: 10000 });
    const commodityFrame = page.frames().find(frame => 
      frame.url().includes('CommodityInfo/Index')
    );
    
    if (!commodityFrame) {
      throw new Error('Could not find Commodity Info iframe');
    }
    
    // Click Add button
    console.log('\n=== OPENING ADD FORM ===');
    await commodityFrame.waitForSelector('a[onclick*="Modal_User"]', { timeout: 5000 });
    await commodityFrame.click('a[onclick*="Modal_User"]');
    console.log('✓ Clicked Add button');
    
    await commodityFrame.waitForTimeout(3000);
    
    // Prepare comprehensive data
    const timestamp = getUnixTimestamp();
    const data = {
      code: String(timestamp),
      name: `Test Product ${timestamp}`,
      specs: `Specifications for ${timestamp}`,
      unitPrice: '15.99',
      costPrice: '8.50',
      expirationDate: '2025-12-31',
      description: `This is a test product created at ${new Date().toISOString()}`
    };
    
    console.log('\n=== FILLING ALL FORM FIELDS ===');
    
    // Fill ALL fields more carefully
    await commodityFrame.evaluate((data) => {
      // Log all inputs found
      const allInputs = document.querySelectorAll('input, textarea, select');
      console.log(`Total form elements found: ${allInputs.length}`);
      
      // Fill text inputs by placeholder or name
      const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
      textInputs.forEach((input, index) => {
        const placeholder = input.placeholder || '';
        const name = input.name || input.id || '';
        
        console.log(`Input ${index}: placeholder="${placeholder}", name="${name}"`);
        
        // Fill based on placeholder content
        if (placeholder.includes('barcode') || placeholder.includes('code') || placeholder.includes('Commodity code')) {
          input.value = data.code;
          input.style.backgroundColor = '#90EE90';
        } else if (placeholder.includes('product name') || placeholder.includes('Product name')) {
          input.value = data.name;
          input.style.backgroundColor = '#90EE90';
        } else if (placeholder.includes('specification') || placeholder.includes('Specs')) {
          input.value = data.specs;
          input.style.backgroundColor = '#90EE90';
        } else if (placeholder.includes('unit price') || placeholder.includes('Unit price')) {
          input.value = data.unitPrice;
          input.style.backgroundColor = '#90EE90';
        } else if (placeholder.includes('purchasing price') || placeholder.includes('Cost price') || placeholder.includes('cost')) {
          input.value = data.costPrice;
          input.style.backgroundColor = '#90EE90';
        } else if (placeholder.includes('expiration') || placeholder.includes('date')) {
          input.value = data.expirationDate;
          input.style.backgroundColor = '#90EE90';
        } else if (input.type === 'text' && input.value === '') {
          // Fill any empty text field with default data
          input.value = data.specs;
          input.style.backgroundColor = '#FFFF99';
        }
        
        // Trigger events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      
      // Fill textareas (like description)
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        textarea.value = data.description;
        textarea.style.backgroundColor = '#90EE90';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // Handle ALL dropdowns - select first real option
      const selects = document.querySelectorAll('select');
      selects.forEach((select, index) => {
        console.log(`Select ${index}: ${select.options.length} options`);
        if (select.options.length > 1) {
          // Skip first option if it's placeholder
          if (select.options[0].value === '' || select.options[0].text.includes('--')) {
            select.selectedIndex = 1;
          } else {
            select.selectedIndex = 0;
          }
          select.style.backgroundColor = '#90EE90';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Check radio buttons and checkboxes
      const radios = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      radios.forEach(radio => {
        console.log(`Radio/Checkbox: ${radio.name} = ${radio.value}`);
      });
      
    }, data);
    
    console.log('✓ All fields filled');
    
    // Upload image
    console.log('\n=== UPLOADING IMAGE ===');
    const imageInput = await commodityFrame.$('input[type="file"][name="WMPImg1"], input[type="file"]:first-of-type');
    if (imageInput) {
      const imagePath = path.join(__dirname, '../../dummy4.jpg');
      await imageInput.setInputFiles(imagePath);
      console.log('✓ Image uploaded');
    }
    
    await commodityFrame.waitForTimeout(2000);
    
    // STEP 1: Click crop submit
    console.log('\n=== STEP 1: CROP CONFIRMATION ===');
    const cropClicked = await commodityFrame.evaluate(() => {
      const btn = document.getElementById('cropsuccess');
      if (btn) {
        btn.style.border = '5px solid green';
        btn.click();
        return true;
      }
      return false;
    });
    
    if (cropClicked) {
      console.log('✓ Crop confirmed');
    } else {
      console.log('⚠️  No crop button found - might not be needed');
    }
    
    await commodityFrame.waitForTimeout(3000);
    
    // STEP 2: Click Edit_CMT submit
    console.log('\n=== STEP 2: SAVE COMMODITY ===');
    const saveClicked = await commodityFrame.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(btn => 
        btn.getAttribute('onclick')?.includes('Edit_CMT')
      );
      
      if (saveBtn) {
        saveBtn.style.border = '5px solid red';
        saveBtn.click();
        return true;
      }
      return false;
    });
    
    if (saveClicked) {
      console.log('✓ Save clicked');
    } else {
      console.log('❌ Could not find Edit_CMT button');
    }
    
    await commodityFrame.waitForTimeout(3000);
    
    // STEP 3: Handle ALL remaining popups
    console.log('\n=== STEP 3: DISMISSING ALL POPUPS ===');
    
    let popupsClosed = 0;
    let attempts = 0;
    
    // Try multiple times to close all popups
    while (attempts < 5) {
      attempts++;
      console.log(`\nAttempt ${attempts} to close popups...`);
      
      const result = await commodityFrame.evaluate(() => {
        const results = {
          clicked: 0,
          foundButtons: []
        };
        
        // Find all buttons with data-dismiss="modal"
        const dismissButtons = Array.from(document.querySelectorAll('button[data-dismiss="modal"]'));
        
        dismissButtons.forEach(btn => {
          const style = window.getComputedStyle(btn);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
          const text = btn.textContent.trim();
          
          if (isVisible) {
            results.foundButtons.push(text);
            
            // Click Submit or OK buttons
            if (text === 'Submit' || text === 'OK' || text === 'Confirm' || text === '确定') {
              btn.style.border = '5px solid lime';
              btn.click();
              results.clicked++;
            }
          }
        });
        
        // Also try to close any visible modals by clicking backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
          backdrop.click();
        });
        
        return results;
      });
      
      if (result.foundButtons.length > 0) {
        console.log(`Found buttons: ${result.foundButtons.join(', ')}`);
        console.log(`Clicked ${result.clicked} buttons`);
        popupsClosed += result.clicked;
      }
      
      await commodityFrame.waitForTimeout(2000);
      
      // Check if we're back on the commodity list
      const onListPage = await commodityFrame.evaluate(() => {
        const pageText = document.body.textContent;
        return pageText.includes('Commodity code') && 
               pageText.includes('Product name') &&
               pageText.includes('Unit price') &&
               !pageText.includes('New commodity information');
      });
      
      if (onListPage) {
        console.log('\n✅ Back on commodity list page!');
        break;
      }
    }
    
    console.log(`\nTotal popups closed: ${popupsClosed}`);
    
    // Verify product was added
    console.log('\n=== VERIFYING PRODUCT ===');
    const productFound = await commodityFrame.evaluate((code) => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent.includes(code)) {
          row.style.backgroundColor = 'yellow';
          row.style.fontSize = '18px';
          return true;
        }
      }
      return false;
    }, data.code);
    
    if (productFound) {
      console.log(`\n✅ SUCCESS! Product added and found in list!`);
      console.log(`   Code: ${data.code}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Price: ${data.unitPrice}`);
      console.log(`   (Row highlighted in yellow)`);
    } else {
      console.log('\n⚠️  Product not found in list - might need approval');
    }
    
    await page.screenshot({ 
      path: `screenshots/commodity_final_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Final screenshot saved');
    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

addCommodityFinalComplete().catch(console.error);