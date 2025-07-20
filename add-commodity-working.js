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

async function addCommodityWorking() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Login
    console.log('=== LOGGING IN ===');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    await page.waitForTimeout(2000);
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
    console.log('✓ Logged in');
    
    // Navigate to Commodity Info using the working method
    console.log('\n=== NAVIGATING TO COMMODITY INFO ===');
    
    // First click the span to expand menu
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const commoditySpan = spans.find(span => 
        span.textContent?.trim() === 'Commodity management' || 
        span.textContent?.includes('Commodity management')
      );
      if (commoditySpan) {
        commoditySpan.click();
        if (commoditySpan.parentElement) {
          commoditySpan.parentElement.click();
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Then call SetMenuLinkUrl
    await page.evaluate(() => {
      if (typeof SetMenuLinkUrl === 'function') {
        SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false);
      }
    });
    
    await page.waitForTimeout(3000);
    
    // VERIFY WE'RE ON THE RIGHT PAGE
    console.log('\n=== VERIFYING PAGE ===');
    const breadcrumbFound = await page.evaluate(() => {
      const pageText = document.body.innerText;
      const hasBreadcrumb = pageText.includes('Commodity management') && pageText.includes('Commodity info');
      
      if (hasBreadcrumb) {
        console.log('✓ Found breadcrumb: "Commodity management > Commodity info"');
        
        // Look for the breadcrumb element and highlight it
        const elements = Array.from(document.querySelectorAll('*'));
        const breadcrumb = elements.find(el => {
          const text = el.textContent || '';
          return text.includes('Commodity management') && text.includes('Commodity info') && text.length < 100;
        });
        
        if (breadcrumb) {
          breadcrumb.style.border = '2px solid green';
          console.log('Breadcrumb element:', breadcrumb.textContent.trim());
        }
      }
      
      return hasBreadcrumb;
    });
    
    if (breadcrumbFound) {
      console.log('✓ Confirmed: We are on Commodity info page');
    } else {
      console.log('⚠️  Warning: Could not verify breadcrumb');
    }
    
    await page.screenshot({ path: `screenshots/commodity_info_verified_${getTimestamp()}.png` });
    
    // FIND AND CLICK +ADD BUTTON
    console.log('\n=== LOOKING FOR +ADD BUTTON ===');
    
    const addButtonFound = await page.evaluate(() => {
      // Look for the specific Add button with onclick="Modal_User('Add')"
      const addButton = document.querySelector('a[onclick="Modal_User(\'Add\')"]');
      
      if (addButton) {
        console.log('Found Add button with Modal_User:', addButton.outerHTML);
        addButton.style.border = '3px solid red';
        addButton.style.backgroundColor = 'yellow';
        addButton.click();
        return true;
      }
      
      // Fallback: look for any link with class btn-success that contains "Add"
      const buttons = Array.from(document.querySelectorAll('a.btn-success'));
      const fallbackButton = buttons.find(btn => btn.textContent.includes('Add'));
      
      if (fallbackButton) {
        console.log('Found Add button (fallback):', fallbackButton.outerHTML);
        fallbackButton.style.border = '3px solid red';
        fallbackButton.style.backgroundColor = 'yellow';
        fallbackButton.click();
        return true;
      }
      
      console.log('Add button not found');
      return false;
    });
    
    if (!addButtonFound) {
      console.log('⚠️  Could not find +Add button, taking screenshot of current state');
      await page.screenshot({ path: `screenshots/no_add_button_${getTimestamp()}.png` });
    } else {
      console.log('✓ Clicked +Add button');
      await page.waitForTimeout(3000);
      
      // POPULATE FORM
      console.log('\n=== POPULATING FORM ===');
      const timestamp = getUnixTimestamp();
      const productName = `dummy${timestamp}`;
      
      console.log(`Commodity Code: ${timestamp}`);
      console.log(`Product Name: ${productName}`);
      console.log(`Specs: ${productName}`);
      console.log(`Price: 1`);
      
      await page.evaluate((data) => {
        // Find all input fields
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type]), textarea');
        console.log(`Found ${inputs.length} input fields`);
        
        inputs.forEach((input, index) => {
          const name = input.name || '';
          const id = input.id || '';
          const placeholder = input.placeholder || '';
          const label = `${name} ${id} ${placeholder}`.toLowerCase();
          
          console.log(`Field ${index}: ${label}`);
          
          // Highlight field
          input.style.border = '2px solid blue';
          
          // Fill based on field identifier
          if (label.includes('code') || label.includes('barcode')) {
            input.value = data.timestamp;
            console.log(`  -> Filled with code: ${data.timestamp}`);
          } else if (label.includes('name') && !label.includes('supplier')) {
            input.value = data.productName;
            console.log(`  -> Filled with name: ${data.productName}`);
          } else if (label.includes('spec') || label.includes('description')) {
            input.value = data.productName;
            console.log(`  -> Filled with specs: ${data.productName}`);
          } else if (label.includes('price') || label.includes('cost')) {
            input.value = '1';
            console.log(`  -> Filled with price: 1`);
          }
          
          // Trigger events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        // Handle dropdowns
        const selects = document.querySelectorAll('select');
        console.log(`Found ${selects.length} dropdown fields`);
        
        selects.forEach((select, index) => {
          const name = select.name || select.id || '';
          console.log(`Dropdown ${index}: ${name}`);
          
          // For type/category, select first real option
          if (name.toLowerCase().includes('type') || name.toLowerCase().includes('category')) {
            if (select.options.length > 1) {
              select.selectedIndex = 1;
              console.log(`  -> Selected first option: ${select.options[1].text}`);
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
      }, { timestamp: String(timestamp), productName });
      
      await page.screenshot({ path: `screenshots/form_populated_${getTimestamp()}.png` });
      
      // LOOK FOR SAVE BUTTON
      console.log('\n=== LOOKING FOR SAVE BUTTON ===');
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
        const saveButton = buttons.find(btn => {
          const text = btn.textContent || btn.value || '';
          if (text.includes('Save') || text.includes('Submit') || text.includes('保存') || text.includes('OK')) {
            btn.style.border = '5px solid red';
            btn.style.backgroundColor = 'lime';
            console.log(`Found save button: "${text.trim()}"`);
            return true;
          }
          return false;
        });
        
        if (!saveButton) {
          console.log('Save button not found');
        }
      });
      
      await page.screenshot({ path: `screenshots/ready_to_save_${getTimestamp()}.png` });
      
      console.log('\n=== FORM READY ===');
      console.log('✓ Form populated with test data');
      console.log('✓ Save button highlighted in red/lime');
      console.log('⚠️  Script will NOT auto-click save');
      console.log('You can manually click save if you want to add the product');
    }
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

addCommodityWorking().catch(console.error);