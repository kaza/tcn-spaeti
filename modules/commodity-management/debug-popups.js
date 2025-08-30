const { chromium } = require('playwright');
const path = require('path');
const { login } = require('../common/login');
const { navigateToCommodityInfo } = require('./add-commodity');

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

async function debugPopups() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    await login(page);
    await navigateToCommodityInfo(page);
    
    await page.waitForSelector('iframe[id="54"], iframe[src*="CommodityInfo"]', { timeout: 10000 });
    const commodityFrame = page.frames().find(frame => 
      frame.url().includes('CommodityInfo/Index')
    );
    
    // Quick fill and save
    await commodityFrame.waitForSelector('a[onclick*="Modal_User"]', { timeout: 5000 });
    await commodityFrame.click('a[onclick*="Modal_User"]');
    await commodityFrame.waitForTimeout(3000);
    
    // Fill form
    const timestamp = getUnixTimestamp();
    await commodityFrame.evaluate((code) => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
      if (inputs[0]) inputs[0].value = code;
      if (inputs[1]) inputs[1].value = 'Test ' + code;
      if (inputs[2]) inputs[2].value = 'Test';
      if (inputs[3]) inputs[3].value = '1';
      inputs.forEach(i => {
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }, String(timestamp));
    
    // Upload image
    const imageInput = await commodityFrame.$('input[type="file"]');
    if (imageInput) {
      await imageInput.setInputFiles(path.join(__dirname, '../../dummy4.jpg'));
    }
    
    // Click crop submit
    await commodityFrame.evaluate(() => {
      const btn = document.getElementById('cropsuccess');
      if (btn) btn.click();
    });
    
    await commodityFrame.waitForTimeout(3000);
    
    // Click Edit_CMT
    await commodityFrame.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.getAttribute('onclick')?.includes('Edit_CMT'));
      if (btn) btn.click();
    });
    
    console.log('\n=== WAITING FOR POPUPS ===');
    await commodityFrame.waitForTimeout(5000);
    
    // Now check ALL modals and popups
    const popupInfo = await commodityFrame.evaluate(() => {
      const results = {
        modals: [],
        alerts: [],
        buttons: []
      };
      
      // Find all modals
      const modals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"]');
      modals.forEach((modal, i) => {
        const style = window.getComputedStyle(modal);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
        
        if (isVisible) {
          modal.style.border = '5px solid red';
          
          // Get modal content
          const text = modal.textContent || '';
          const buttons = Array.from(modal.querySelectorAll('button')).map(btn => ({
            text: btn.textContent.trim(),
            onclick: btn.getAttribute('onclick'),
            classes: btn.className,
            dataDismiss: btn.getAttribute('data-dismiss')
          }));
          
          results.modals.push({
            index: i,
            id: modal.id,
            className: modal.className,
            textPreview: text.substring(0, 200),
            buttons: buttons,
            isVisible: true
          });
        }
      });
      
      // Find alert/message boxes
      const alerts = document.querySelectorAll('.alert, .message-box, [class*="alert"], [class*="message"]');
      alerts.forEach(alert => {
        const style = window.getComputedStyle(alert);
        if (style.display !== 'none') {
          results.alerts.push({
            className: alert.className,
            text: alert.textContent.trim().substring(0, 100)
          });
        }
      });
      
      // Find ALL buttons currently visible
      const allButtons = Array.from(document.querySelectorAll('button'));
      allButtons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          btn.style.border = '3px solid blue';
          results.buttons.push({
            text: btn.textContent.trim(),
            onclick: btn.getAttribute('onclick'),
            dataDismiss: btn.getAttribute('data-dismiss'),
            className: btn.className
          });
        }
      });
      
      return results;
    });
    
    console.log('\n=== POPUP ANALYSIS ===');
    console.log(`Found ${popupInfo.modals.length} visible modals`);
    console.log(`Found ${popupInfo.alerts.length} alerts`);
    console.log(`Found ${popupInfo.buttons.length} visible buttons`);
    
    if (popupInfo.modals.length > 0) {
      console.log('\nVISIBLE MODALS:');
      popupInfo.modals.forEach(modal => {
        console.log(`\nModal ${modal.index}:`);
        console.log(`  ID: ${modal.id}`);
        console.log(`  Class: ${modal.className}`);
        console.log(`  Text preview: ${modal.textPreview}`);
        console.log(`  Buttons in modal:`);
        modal.buttons.forEach(btn => {
          console.log(`    - "${btn.text}" (data-dismiss="${btn.dataDismiss}")`);
        });
      });
    }
    
    console.log('\nALL VISIBLE BUTTONS:');
    popupInfo.buttons.forEach(btn => {
      console.log(`- "${btn.text}" (dismiss: ${btn.dataDismiss}, onclick: ${btn.onclick})`);
    });
    
    // Try to click any submit/ok/confirm button with data-dismiss
    console.log('\n=== ATTEMPTING TO DISMISS POPUPS ===');
    
    const dismissed = await commodityFrame.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[data-dismiss="modal"]'));
      let clicked = 0;
      
      buttons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          console.log(`Clicking: ${btn.textContent.trim()}`);
          btn.click();
          clicked++;
        }
      });
      
      return clicked;
    });
    
    console.log(`\nClicked ${dismissed} dismiss buttons`);
    
    console.log('\nModals are outlined in RED');
    console.log('Buttons are outlined in BLUE');
    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

debugPopups().catch(console.error);