const { chromium } = require('playwright');

async function loginToOurvend() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  try {
    const context = await browser.newContext({
      // Set viewport for consistent behavior
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Enable console logging from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('Navigating to login page...');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'networkidle'
    });

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give time for any JS to initialize

    // Check if there's a drag verification component
    const dragVerification = await page.$('.drag-verification, .slider-verification');
    if (dragVerification) {
      console.log('Drag verification detected - may need manual intervention');
    }

    console.log('Filling in credentials...');
    
    // Clear and fill username
    await page.locator('#userName').clear();
    await page.locator('#userName').type('Spaetitogo', { delay: 100 });
    
    // Clear and fill password
    await page.locator('#passWord').clear();
    await page.locator('#passWord').type('Zebra1234!', { delay: 100 });

    // Take screenshot before login
    await page.screenshot({ path: 'before-login.png', fullPage: true });

    // Try to find the login button or link
    console.log('Looking for login button...');
    
    // Common selectors for login buttons
    const loginSelectors = [
      'button[onclick*="login"]',
      'a[onclick*="login"]',
      'button:has-text("登录")',
      'button:has-text("Login")',
      'input[type="submit"]',
      'button[type="submit"]',
      '.login-btn',
      '#loginBtn'
    ];

    let loginClicked = false;
    
    for (const selector of loginSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`Found login element with selector: ${selector}`);
        await element.click();
        loginClicked = true;
        break;
      }
    }

    if (!loginClicked) {
      // If no button found, try to call the login function directly
      console.log('No login button found, trying to call login function directly...');
      
      const loginFunctionExists = await page.evaluate(() => {
        return typeof window.login === 'function' || 
               typeof window.Login === 'function' ||
               typeof window.doLogin === 'function';
      });

      if (loginFunctionExists) {
        await page.evaluate(() => {
          if (typeof window.login === 'function') window.login();
          else if (typeof window.Login === 'function') window.Login();
          else if (typeof window.doLogin === 'function') window.doLogin();
        });
      } else {
        console.log('No login function found in window object');
      }
    }

    console.log('Waiting for login response...');
    
    // Wait for either navigation, URL change, or AJAX response
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }),
      page.waitForResponse(response => 
        response.url().includes('/Account/Login') && 
        response.status() === 200, 
        { timeout: 10000 }
      ),
      page.waitForURL('**/Dashboard**', { timeout: 10000 }).catch(() => {}),
      page.waitForURL('**/Home**', { timeout: 10000 }).catch(() => {}),
      page.waitForTimeout(10000)
    ]);

    // Check current state
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for error messages
    const errorMessages = await page.$$eval('.error-message, .alert-danger, .validation-summary-errors', 
      elements => elements.map(el => el.textContent.trim())
    );
    
    if (errorMessages.length > 0) {
      console.log('Error messages found:', errorMessages);
    }

    // Take screenshot after login attempt
    await page.screenshot({ path: 'after-login.png', fullPage: true });

    // Check if we're still on login page
    if (currentUrl.includes('/Account/Login')) {
      console.log('Still on login page - login may have failed');
      
      // Try to get any response from network
      const responses = await page.evaluate(() => {
        return window.performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('/Account/Login'))
          .map(entry => ({ name: entry.name, status: entry.responseStatus }));
      });
      console.log('Network responses:', responses);
    } else {
      console.log('Login successful! Redirected to:', currentUrl);
    }

    // Save cookies for future use
    const cookies = await context.cookies();
    const fs = require('fs').promises;
    await fs.writeFile('cookies.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies saved to cookies.json');

    console.log('Browser will remain open. Press Ctrl+C to exit...');
    await new Promise(() => {}); // Keep browser open

  } catch (error) {
    console.error('Error during login:', error);
    await browser.close();
  }
}

// Run the function
loginToOurvend().catch(console.error);