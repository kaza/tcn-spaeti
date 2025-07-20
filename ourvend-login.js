const { chromium } = require('playwright');

async function loginToOurvend() {
  // Launch browser
  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 50 // Slow down actions by 50ms for visibility
  });

  try {
    // Create a new browser context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'networkidle',
      timeout: 120000 // 2 minutes timeout
    });

    // Wait for the login form to be loaded
    await page.waitForSelector('#userName', { state: 'visible' });
    
    // Fill in the credentials
    console.log('Filling in credentials...');
    await page.fill('#userName', 'Spaetitogo');
    await page.fill('#passWord', 'Zebra1234!');

    // Take a screenshot before login (optional)
    await page.screenshot({ path: 'before-login.png' });

    // Click the login button
    console.log('Clicking login button...');
    // The page might have a custom login function, so we'll try multiple approaches
    
    // First, try to find and click the login button
    const loginButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("登录"), button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("SIGN IN"), a:has-text("Sign In"), .signin-button, #signin-button');
    if (loginButton) {
      await loginButton.click();
    } else {
      // If no button found, try to submit the form
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        } else {
          // Try to call the login function directly if it exists
          if (typeof window.login === 'function') {
            window.login();
          }
        }
      });
    }

    // Wait for navigation or any indication of successful login
    console.log('Waiting for login to complete...');
    
    // Wait for either navigation or a change in the page
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.waitForTimeout(5000) // Timeout after 5 seconds
    ]);

    // Check if login was successful by looking for common indicators
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Take a screenshot after login
    await page.screenshot({ path: 'after-login.png' });

    // Keep browser open for inspection (remove this in production)
    console.log('Login attempt completed. Check the screenshots and browser window.');
    console.log('Press Ctrl+C to close the browser...');
    
    // Wait indefinitely (for debugging)
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error during login:', error);
    await browser.close();
  }
}

// Run the login function
loginToOurvend().catch(console.error);