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

async function debugCommodityMenu() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const page = await browser.newPage();
    
    // Login first
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
    console.log('✓ Logged in, current URL:', page.url());
    
    // METHOD 1: Try to find and click the span
    console.log('\n=== METHOD 1: TRYING TO CLICK COMMODITY MANAGEMENT SPAN ===');
    
    const spanFound = await page.evaluate(() => {
      // Find all spans
      const spans = Array.from(document.querySelectorAll('span'));
      console.log(`Found ${spans.length} total spans`);
      
      // Find the one with Commodity management
      const commoditySpan = spans.find(span => {
        const text = span.textContent || '';
        return text.trim() === 'Commodity management' || text.includes('Commodity management');
      });
      
      if (commoditySpan) {
        console.log('Found span:', commoditySpan.outerHTML);
        console.log('Parent element:', commoditySpan.parentElement.outerHTML);
        
        // Highlight it
        commoditySpan.style.border = '3px solid red';
        commoditySpan.style.backgroundColor = 'yellow';
        
        // Try clicking the span
        commoditySpan.click();
        console.log('Clicked the span');
        
        // Also try clicking the parent
        if (commoditySpan.parentElement) {
          commoditySpan.parentElement.click();
          console.log('Also clicked the parent element');
        }
        
        return true;
      }
      
      console.log('Commodity management span not found');
      return false;
    });
    
    await page.screenshot({ path: `screenshots/debug_after_span_click_${getTimestamp()}.png` });
    
    if (spanFound) {
      console.log('✓ Found and clicked the span');
      console.log('⏳ Waiting 5 seconds to see if submenu opens...');
      await page.waitForTimeout(5000);
      
      // Check if submenu appeared
      const submenuAppeared = await page.evaluate(() => {
        const commodityInfo = document.querySelector('a[onclick*="CommodityInfo"]');
        return !!commodityInfo;
      });
      
      if (submenuAppeared) {
        console.log('✓ Submenu appeared!');
      } else {
        console.log('✗ Submenu did not appear');
      }
    }
    
    // METHOD 2: Try to execute SetMenuLinkUrl directly
    console.log('\n=== METHOD 2: TRYING TO EXECUTE SetMenuLinkUrl DIRECTLY ===');
    console.log('Attempting to call: SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false)');
    
    try {
      const result = await page.evaluate(() => {
        // Check if function exists
        if (typeof SetMenuLinkUrl === 'function') {
          console.log('SetMenuLinkUrl function exists!');
          SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false);
          return 'Function called successfully';
        } else if (typeof window.SetMenuLinkUrl === 'function') {
          console.log('window.SetMenuLinkUrl function exists!');
          window.SetMenuLinkUrl(54, "Commodity info", "/CommodityInfo/Index", false);
          return 'Function called via window';
        } else {
          console.log('SetMenuLinkUrl function not found');
          return 'Function not found';
        }
      });
      
      console.log('Result:', result);
      await page.waitForTimeout(3000);
      console.log('Current URL after function call:', page.url());
      
    } catch (error) {
      console.log('Error calling SetMenuLinkUrl:', error.message);
    }
    
    // METHOD 3: Try to find the actual link and click it
    console.log('\n=== METHOD 3: TRYING TO FIND AND CLICK THE COMMODITY INFO LINK ===');
    
    const linkClicked = await page.evaluate(() => {
      // Look for the exact link
      const links = Array.from(document.querySelectorAll('a'));
      const commodityInfoLink = links.find(a => {
        const onclick = a.getAttribute('onclick') || '';
        return onclick.includes('CommodityInfo/Index') || a.textContent.includes('Commodity info');
      });
      
      if (commodityInfoLink) {
        console.log('Found Commodity info link:', commodityInfoLink.outerHTML);
        commodityInfoLink.style.border = '3px solid green';
        commodityInfoLink.click();
        return true;
      }
      
      console.log('Commodity info link not found');
      return false;
    });
    
    if (linkClicked) {
      console.log('✓ Clicked Commodity info link');
      await page.waitForTimeout(3000);
      console.log('Current URL:', page.url());
    }
    
    await page.screenshot({ path: `screenshots/debug_final_state_${getTimestamp()}.png` });
    
    console.log('\n=== DEBUGGING COMPLETE ===');
    console.log('Check the screenshots and let me know:');
    console.log('1. Did the Commodity management menu expand?');
    console.log('2. Did we navigate to Commodity info page?');
    console.log('3. What should we try differently?');
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

debugCommodityMenu().catch(console.error);