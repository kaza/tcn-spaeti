const { chromium } = require('playwright');

const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

async function clickAddModal() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Login
    console.log('Logging in...');
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
    
    // Navigate to Commodity Info
    console.log('Navigating to Commodity Info...');
    
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
    
    // Wait for page to load and button to appear
    console.log('Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Try multiple methods to click the Add button
    console.log('\n=== ATTEMPTING TO CLICK ADD BUTTON ===');
    
    // Method 1: Direct JavaScript execution
    console.log('Method 1: Calling Modal_User directly...');
    const modalResult = await page.evaluate(() => {
      if (typeof Modal_User === 'function') {
        console.log('Modal_User function exists, calling it...');
        Modal_User('Add');
        return 'Modal_User called successfully';
      } else if (typeof window.Modal_User === 'function') {
        console.log('window.Modal_User exists, calling it...');
        window.Modal_User('Add');
        return 'window.Modal_User called successfully';
      } else {
        return 'Modal_User function not found';
      }
    });
    console.log('Result:', modalResult);
    
    await page.waitForTimeout(2000);
    
    // Method 2: Find and click the actual element
    console.log('\nMethod 2: Finding and clicking the element...');
    const clicked = await page.evaluate(() => {
      // Try multiple selectors
      const selectors = [
        'a[onclick*="Modal_User"]',
        'a[onclick="Modal_User(\'Add\')"]',
        'a.btn-success:has-text("Add")',
        'a:has(span.glyphicon-plus)'
      ];
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            elements[0].style.border = '5px solid red';
            elements[0].click();
            return true;
          }
        } catch (e) {
          console.log(`Selector failed: ${selector}`);
        }
      }
      
      // Last resort: find by searching all links
      const allLinks = Array.from(document.querySelectorAll('a'));
      const addLink = allLinks.find(link => {
        const onclick = link.getAttribute('onclick') || '';
        return onclick.includes('Modal_User') && onclick.includes('Add');
      });
      
      if (addLink) {
        console.log('Found Add link by searching all links');
        addLink.style.border = '5px solid red';
        addLink.click();
        return true;
      }
      
      return false;
    });
    
    if (clicked) {
      console.log('✓ Add button clicked!');
    } else {
      console.log('✗ Could not click Add button');
    }
    
    // Wait for modal to appear
    console.log('\nWaiting for modal to appear...');
    await page.waitForTimeout(3000);
    
    // Check if modal appeared
    const modalAppeared = await page.evaluate(() => {
      const modals = document.querySelectorAll('.modal, .modal-dialog, [class*="modal"]');
      console.log(`Found ${modals.length} modal elements`);
      
      // Also check for any new form fields
      const formInputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
      console.log(`Found ${formInputs.length} editable input fields`);
      
      return modals.length > 0 || formInputs.length > 5;
    });
    
    if (modalAppeared) {
      console.log('✓ Modal/form appeared!');
      
      // Fill the form
      console.log('\n=== FILLING FORM ===');
      const timestamp = getUnixTimestamp();
      const productName = `dummy${timestamp}`;
      
      await page.evaluate((data) => {
        const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly]), textarea');
        console.log(`Filling ${inputs.length} input fields...`);
        
        inputs.forEach((input, index) => {
          const name = (input.name || input.id || input.placeholder || '').toLowerCase();
          console.log(`Field ${index}: ${name}`);
          
          if (name.includes('code') || index === 0) {
            input.value = data.timestamp;
          } else if (name.includes('name') && !name.includes('supplier')) {
            input.value = data.productName;
          } else if (name.includes('spec')) {
            input.value = data.productName;
          } else if (name.includes('price') || input.type === 'number') {
            input.value = '1';
          } else {
            input.value = data.productName;
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
      }, { timestamp: String(timestamp), productName });
      
      console.log(`\nForm filled with:`);
      console.log(`Commodity Code: ${timestamp}`);
      console.log(`Product Name: ${productName}`);
      
      // Highlight save button
      await page.evaluate(() => {
        const saveButtons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
        const saveBtn = saveButtons.find(btn => {
          const text = (btn.textContent || btn.value || '').toLowerCase();
          return text.includes('save') || text.includes('submit') || text.includes('ok');
        });
        
        if (saveBtn) {
          saveBtn.style.border = '5px solid lime';
          saveBtn.style.backgroundColor = 'yellow';
          console.log('Save button highlighted');
        }
      });
    }
    
    await page.screenshot({ path: `screenshots/add_modal_final_${getTimestamp()}.png` });
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

clickAddModal().catch(console.error);