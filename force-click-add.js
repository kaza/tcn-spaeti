const { chromium } = require('playwright');

async function forceClickAdd() {
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
    
    console.log('\n=== TRYING MULTIPLE METHODS TO CLICK ADD BUTTON ===\n');
    
    // Method 1: Use Playwright's click with force
    console.log('Method 1: Playwright force click...');
    try {
      await page.click('a:has-text("Add")', { force: true, timeout: 3000 });
      console.log('✓ Method 1 succeeded!');
    } catch (e) {
      console.log('✗ Method 1 failed:', e.message);
    }
    
    await page.waitForTimeout(2000);
    
    // Method 2: Use Playwright's locator
    console.log('\nMethod 2: Playwright locator click...');
    try {
      await page.locator('a.btn-success').filter({ hasText: 'Add' }).click({ timeout: 3000 });
      console.log('✓ Method 2 succeeded!');
    } catch (e) {
      console.log('✗ Method 2 failed:', e.message);
    }
    
    await page.waitForTimeout(2000);
    
    // Method 3: Direct JavaScript click
    console.log('\nMethod 3: Direct JavaScript click...');
    const clicked3 = await page.evaluate(() => {
      const addBtn = document.querySelector('a[onclick*="Modal_User"]');
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    console.log(clicked3 ? '✓ Method 3 succeeded!' : '✗ Method 3 failed: button not found');
    
    await page.waitForTimeout(2000);
    
    // Method 4: Click by evaluating onclick
    console.log('\nMethod 4: Execute onclick content...');
    const clicked4 = await page.evaluate(() => {
      const addBtn = document.querySelector('a[onclick*="Modal_User"]');
      if (addBtn) {
        const onclickAttr = addBtn.getAttribute('onclick');
        eval(onclickAttr);
        return true;
      }
      return false;
    });
    console.log(clicked4 ? '✓ Method 4 succeeded!' : '✗ Method 4 failed');
    
    await page.waitForTimeout(2000);
    
    // Method 5: Direct function call
    console.log('\nMethod 5: Direct Modal_User call...');
    const result5 = await page.evaluate(() => {
      try {
        if (typeof Modal_User === 'function') {
          Modal_User('Add');
          return 'function called';
        } else if (typeof window.Modal_User === 'function') {
          window.Modal_User('Add');
          return 'window.function called';
        } else {
          // Try to find it in other places
          const scripts = Array.from(document.querySelectorAll('script'));
          for (const script of scripts) {
            if (script.textContent && script.textContent.includes('Modal_User')) {
              return 'function found in scripts but not accessible';
            }
          }
          return 'function not found';
        }
      } catch (e) {
        return 'error: ' + e.message;
      }
    });
    console.log('✓ Method 5 result:', result5);
    
    await page.waitForTimeout(2000);
    
    // Method 6: Dispatch click event
    console.log('\nMethod 6: Dispatch click event...');
    const clicked6 = await page.evaluate(() => {
      const addBtn = document.querySelector('a[onclick*="Modal_User"]');
      if (addBtn) {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        addBtn.dispatchEvent(clickEvent);
        return true;
      }
      return false;
    });
    console.log(clicked6 ? '✓ Method 6 succeeded!' : '✗ Method 6 failed');
    
    // Check if modal appeared
    console.log('\n=== CHECKING FOR MODAL ===');
    await page.waitForTimeout(3000);
    
    const modalCheck = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]:not([readonly])');
      const modals = document.querySelectorAll('.modal, [id*="modal"], [class*="modal"]');
      const visibleModals = Array.from(modals).filter(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      return {
        inputCount: inputs.length,
        modalCount: modals.length,
        visibleModalCount: visibleModals.length,
        pageHasAddForm: document.body.textContent.includes('New commodity information')
      };
    });
    
    console.log('\nResults:');
    console.log(`- Input fields found: ${modalCheck.inputCount}`);
    console.log(`- Total modals: ${modalCheck.modalCount}`);
    console.log(`- Visible modals: ${modalCheck.visibleModalCount}`);
    console.log(`- "New commodity information" text found: ${modalCheck.pageHasAddForm}`);
    
    if (modalCheck.inputCount > 5 || modalCheck.pageHasAddForm) {
      console.log('\n✅ SUCCESS! The Add form is open!');
      console.log('The form can now be filled.');
    } else {
      console.log('\n❌ The Add form did not open.');
      console.log('\nYou can try clicking it manually now.');
    }
    
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

forceClickAdd().catch(console.error);