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

async function clickAddLink() {
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
    
    await page.waitForTimeout(5000);
    console.log('✓ On Commodity Info page\n');
    
    // Find and click the Add link
    console.log('=== FINDING AND CLICKING ADD LINK ===\n');
    
    // First, let's find all links and see what we have
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        onclick: link.getAttribute('onclick'),
        classes: link.className
      })).filter(link => link.text.includes('Add'));
    });
    
    console.log('Found links with "Add" text:', links);
    
    // Now click the Add link
    console.log('\nClicking Add link...');
    const clicked = await page.evaluate(() => {
      // Find all <a> tags
      const allLinks = Array.from(document.querySelectorAll('a'));
      
      // Find the one that contains "Add" text
      const addLink = allLinks.find(link => {
        const text = link.textContent || '';
        return text.trim() === 'Add' || text.includes('Add');
      });
      
      if (addLink) {
        console.log('Found Add link:', addLink.outerHTML);
        addLink.style.border = '5px solid red';
        addLink.click();
        return true;
      }
      
      return false;
    });
    
    if (clicked) {
      console.log('✓ Add link clicked!');
    } else {
      console.log('✗ Could not find Add link');
      
      // Try with Playwright selector
      console.log('\nTrying Playwright selector...');
      try {
        await page.click('a:text("Add")');
        console.log('✓ Clicked with Playwright!');
      } catch (e) {
        console.log('✗ Playwright click failed:', e.message);
      }
    }
    
    // Wait for modal
    console.log('\nWaiting for modal to appear...');
    await page.waitForTimeout(3000);
    
    // Check if form appeared
    const formAppeared = await page.evaluate(() => {
      const hasNewCommodityText = document.body.textContent.includes('New commodity information');
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly])');
      return {
        hasForm: hasNewCommodityText,
        inputCount: inputs.length
      };
    });
    
    if (formAppeared.hasForm || formAppeared.inputCount > 5) {
      console.log('\n✅ SUCCESS! Add form opened!');
      console.log(`Found ${formAppeared.inputCount} input fields`);
      
      // Fill the form
      console.log('\n=== FILLING FORM ===');
      const timestamp = getUnixTimestamp();
      const productName = `dummy${timestamp}`;
      
      await page.evaluate((data) => {
        // Map field names to values
        const fieldMapping = {
          'code': data.timestamp,
          'barcode': data.timestamp,
          'name': data.productName,
          'product': data.productName,
          'spec': data.productName,
          'price': '1',
          'unit': '1',
          'cost': '1'
        };
        
        const inputs = document.querySelectorAll('input[type="text"]:not([readonly]), input[type="number"]:not([readonly])');
        inputs.forEach((input, index) => {
          const name = (input.name || input.id || input.placeholder || '').toLowerCase();
          
          // Find matching field
          for (const [key, value] of Object.entries(fieldMapping)) {
            if (name.includes(key)) {
              input.value = value;
              input.style.backgroundColor = '#90EE90';
              break;
            }
          }
          
          // If no match, use default
          if (!input.value && index === 0) {
            input.value = data.timestamp; // First field is usually code
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
      console.log(`- Commodity Code: ${timestamp}`);
      console.log(`- Product Name: ${productName}`);
      console.log(`- Price: 1`);
      
      await page.screenshot({ path: `screenshots/commodity_form_filled_${getTimestamp()}.png` });
      console.log('\n✓ Screenshot saved');
    } else {
      console.log('\n❌ Add form did not open');
    }
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

clickAddLink().catch(console.error);