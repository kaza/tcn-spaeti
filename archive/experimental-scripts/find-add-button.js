const { chromium } = require('playwright');

async function findAddButton() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
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
    
    // Wait longer for page to fully load
    console.log('Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Now search for ALL buttons/links on the page
    console.log('\n=== SEARCHING FOR ALL BUTTONS AND LINKS ===');
    
    const allButtons = await page.evaluate(() => {
      const results = [];
      
      // Get all links
      const links = Array.from(document.querySelectorAll('a'));
      links.forEach((link, index) => {
        const text = link.textContent || '';
        const onclick = link.getAttribute('onclick') || '';
        const classes = link.className || '';
        const href = link.getAttribute('href') || '';
        
        results.push({
          type: 'link',
          index: index,
          text: text.trim(),
          onclick: onclick,
          classes: classes,
          href: href,
          html: link.outerHTML.substring(0, 200)
        });
        
        // Highlight links that might be Add buttons
        if (text.includes('Add') || onclick.includes('Modal_User') || classes.includes('btn-success')) {
          link.style.border = '3px solid red';
          link.style.backgroundColor = 'yellow';
        }
      });
      
      // Get all buttons
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.forEach((button, index) => {
        const text = button.textContent || '';
        const onclick = button.getAttribute('onclick') || '';
        const classes = button.className || '';
        
        results.push({
          type: 'button',
          index: index,
          text: text.trim(),
          onclick: onclick,
          classes: classes,
          html: button.outerHTML.substring(0, 200)
        });
        
        if (text.includes('Add') || text.includes('New')) {
          button.style.border = '3px solid blue';
        }
      });
      
      return results;
    });
    
    // Print all buttons/links that might be Add
    console.log('\nPotential Add buttons:');
    allButtons.forEach(btn => {
      if (btn.text.includes('Add') || btn.text.includes('New') || 
          btn.onclick.includes('Modal_User') || btn.classes.includes('btn-success')) {
        console.log(`\n${btn.type.toUpperCase()} #${btn.index}:`);
        console.log(`  Text: "${btn.text}"`);
        console.log(`  OnClick: "${btn.onclick}"`);
        console.log(`  Classes: "${btn.classes}"`);
        console.log(`  HTML: ${btn.html}`);
      }
    });
    
    // Try to click using Playwright's click method
    console.log('\n=== TRYING PLAYWRIGHT SELECTORS ===');
    
    try {
      // Try exact selector
      const addBtn = await page.$('a[onclick="Modal_User(\'Add\')"]');
      if (addBtn) {
        console.log('✓ Found Add button with Playwright selector');
        await addBtn.click();
      } else {
        // Try text selector
        const textBtn = await page.locator('a:has-text("Add")').first();
        if (await textBtn.count() > 0) {
          console.log('✓ Found Add button with text selector');
          await textBtn.click();
        } else {
          console.log('✗ Could not find Add button with Playwright selectors');
        }
      }
    } catch (error) {
      console.log('Error with Playwright selectors:', error.message);
    }
    
    await page.screenshot({ path: `screenshots/all_buttons_highlighted_${new Date().getTime()}.png` });
    
    console.log('\nCheck the browser and screenshots.');
    console.log('All potential Add buttons are highlighted.');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

findAddButton().catch(console.error);