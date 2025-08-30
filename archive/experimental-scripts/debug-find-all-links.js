const { chromium } = require('playwright');

async function debugFindAllLinks() {
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
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(7000);
    
    console.log('\n=== DEBUGGING: FINDING ALL LINKS ===\n');
    
    // Find ALL links and display them
    const allLinksInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      console.log(`Total <a> elements found: ${links.length}`);
      
      // Highlight ALL links
      links.forEach((link, index) => {
        link.style.border = '2px solid blue';
        link.style.backgroundColor = 'lightblue';
      });
      
      // Get info about each link
      return links.map((link, index) => {
        const text = link.textContent ? link.textContent.trim() : '';
        const onclick = link.getAttribute('onclick') || '';
        const href = link.getAttribute('href') || '';
        const className = link.className || '';
        const isVisible = link.offsetParent !== null;
        
        // Highlight potential Add buttons extra
        if (text.includes('Add') || onclick.includes('Modal_User')) {
          link.style.border = '5px solid red';
          link.style.backgroundColor = 'yellow';
          link.style.fontSize = '20px';
        }
        
        return {
          index: index,
          text: text,
          onclick: onclick,
          href: href,
          className: className,
          visible: isVisible,
          html: link.outerHTML.substring(0, 150)
        };
      });
    });
    
    console.log(`Found ${allLinksInfo.length} total <a> elements\n`);
    
    // Show links that might be Add
    console.log('Links containing "Add" or Modal_User:');
    allLinksInfo.forEach(link => {
      if (link.text.includes('Add') || link.onclick.includes('Modal_User')) {
        console.log(`\nLink #${link.index}:`);
        console.log(`  Text: "${link.text}"`);
        console.log(`  OnClick: "${link.onclick}"`);
        console.log(`  Classes: "${link.className}"`);
        console.log(`  Visible: ${link.visible}`);
        console.log(`  HTML: ${link.html}`);
      }
    });
    
    // Show first 10 links for debugging
    console.log('\n\nFirst 10 links on page:');
    allLinksInfo.slice(0, 10).forEach(link => {
      console.log(`#${link.index}: "${link.text}" (visible: ${link.visible})`);
    });
    
    // Try one more time with specific selector
    console.log('\n\n=== TRYING SPECIFIC SELECTORS ===');
    
    const trySelectors = [
      'a[onclick="Modal_User(\'Add\')"]',
      'a[onclick*="Modal_User"]',
      'a.btn-success',
      'a:has-text("Add")',
      'a'
    ];
    
    for (const selector of trySelectors) {
      try {
        const count = await page.locator(selector).count();
        console.log(`Selector "${selector}" found: ${count} elements`);
        
        if (count > 0 && selector.includes('Modal_User')) {
          console.log('  -> Clicking first match...');
          await page.locator(selector).first().click();
          console.log('  -> Clicked!');
          break;
        }
      } catch (e) {
        console.log(`Selector "${selector}" error: ${e.message}`);
      }
    }
    
    console.log('\n\nAll links are highlighted in BLUE');
    console.log('Add button (if found) is highlighted in RED/YELLOW');
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

debugFindAllLinks().catch(console.error);