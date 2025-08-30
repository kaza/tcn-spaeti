const { chromium } = require('playwright');

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

async function retryAddButton() {
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
    
    console.log('Waiting for page to fully load...');
    await page.waitForTimeout(7000); // Longer initial wait
    console.log('✓ Should be on Commodity Info page\n');
    
    // Try to find and click Add button multiple times
    console.log('=== ATTEMPTING TO FIND AND CLICK ADD BUTTON ===\n');
    
    let addClicked = false;
    const maxAttempts = 5;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);
      
      // Method 1: Find by evaluating page
      const foundAndClicked = await page.evaluate(() => {
        // Find all <a> elements
        const allLinks = Array.from(document.querySelectorAll('a'));
        
        // Log what we found
        console.log(`Found ${allLinks.length} total links`);
        
        // Find Add link
        const addLink = allLinks.find(link => {
          const text = link.textContent || '';
          const onclick = link.getAttribute('onclick') || '';
          
          // Multiple conditions to find Add button
          return (text.trim() === 'Add' || 
                  text.includes('Add') || 
                  onclick.includes("Modal_User('Add')"));
        });
        
        if (addLink) {
          console.log('Found Add link:', addLink.outerHTML.substring(0, 100));
          addLink.style.border = '5px solid red';
          addLink.style.backgroundColor = 'yellow';
          addLink.click();
          return true;
        }
        
        return false;
      });
      
      if (foundAndClicked) {
        console.log('✓ Add button found and clicked!');
        addClicked = true;
        break;
      }
      
      // Method 2: Try Playwright selector
      try {
        const addButton = await page.$('a:has-text("Add")');
        if (addButton) {
          await addButton.click();
          console.log('✓ Add button clicked with Playwright!');
          addClicked = true;
          break;
        }
      } catch (e) {
        // Silent fail
      }
      
      // Method 3: Try by onclick attribute
      try {
        const modalButton = await page.$('a[onclick*="Modal_User"]');
        if (modalButton) {
          await modalButton.click();
          console.log('✓ Add button clicked by onclick attribute!');
          addClicked = true;
          break;
        }
      } catch (e) {
        // Silent fail
      }
      
      console.log(`✗ Attempt ${attempt} failed, waiting 2 seconds...`);
      await page.waitForTimeout(2000);
    }
    
    if (!addClicked) {
      console.log('\n❌ Could not find Add button after all attempts');
      console.log('Taking screenshot of current state...');
      await page.screenshot({ path: `screenshots/no_add_button_found_${getTimestamp()}.png` });
    } else {
      // Wait for modal to appear
      console.log('\nWaiting for modal to appear...');
      await page.waitForTimeout(3000);
      
      // Check if form appeared and fill it
      const formReady = await page.evaluate(() => {
        const hasForm = document.body.textContent.includes('New commodity information') ||
                       document.body.textContent.includes('Commodity code');
        const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
        return {
          hasForm: hasForm,
          inputCount: inputs.length
        };
      });
      
      if (formReady.hasForm || formReady.inputCount > 3) {
        console.log(`\n✅ Form opened! Found ${formReady.inputCount} input fields`);
        
        // Fill the form
        console.log('\n=== FILLING FORM ===');
        const timestamp = getUnixTimestamp();
        const productName = `dummy${timestamp}`;
        
        await page.evaluate((data) => {
          const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
          
          inputs.forEach((input, index) => {
            const placeholder = input.placeholder || '';
            const name = (input.name || input.id || '').toLowerCase();
            
            // Fill based on placeholder or name
            if (placeholder.includes('barcode') || placeholder.includes('code') || name.includes('code') || index === 0) {
              input.value = data.timestamp;
              input.style.backgroundColor = '#90EE90';
            } else if (placeholder.includes('product name') || name.includes('name')) {
              input.value = data.productName;
              input.style.backgroundColor = '#90EE90';
            } else if (placeholder.includes('specification') || placeholder.includes('spec') || name.includes('spec')) {
              input.value = data.productName;
              input.style.backgroundColor = '#90EE90';
            } else if (placeholder.includes('unit price') || placeholder.includes('price') || name.includes('price')) {
              input.value = '1';
              input.style.backgroundColor = '#90EE90';
            } else if (placeholder.includes('purchasing price') || placeholder.includes('cost')) {
              input.value = '1';
              input.style.backgroundColor = '#90EE90';
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
          
          // Highlight save button
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
          const saveBtn = buttons.find(btn => {
            const text = (btn.textContent || btn.value || '').toLowerCase();
            return text.includes('save') || text.includes('submit') || text.includes('ok') || text.includes('confirm');
          });
          
          if (saveBtn) {
            saveBtn.style.border = '5px solid lime';
            saveBtn.style.backgroundColor = 'yellow';
            saveBtn.style.fontSize = '20px';
          }
        }, { timestamp: String(timestamp), productName });
        
        console.log(`\nForm filled with:`);
        console.log(`- Commodity Code: ${timestamp}`);
        console.log(`- Product Name: ${productName}`);
        console.log(`- Price: 1`);
        
        await page.screenshot({ path: `screenshots/commodity_form_ready_${getTimestamp()}.png` });
        console.log('\n✓ Form filled and screenshot saved');
        console.log('✓ Save button should be highlighted in GREEN/YELLOW');
      }
    }
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

retryAddButton().catch(console.error);