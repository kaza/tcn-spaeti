const { chromium } = require('playwright');

// Helper function to generate timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

async function loginToOurvend() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down to see what's happening
  });

  try {
    const page = await browser.newPage();
    
    console.log('Navigating to login page...');
    await page.goto('https://os.ourvend.com/Account/Login', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    // Wait a bit for page to settle
    await page.waitForTimeout(3000);

    // Screenshot before filling credentials
    await page.screenshot({ 
      path: `screenshots/login_before_${getTimestamp()}.png`,
      fullPage: true 
    });

    console.log('Filling credentials...');
    await page.fill('#userName', 'Spaetitogo');
    await page.fill('#passWord', 'Zebra1234!');

    // Screenshot after filling credentials
    await page.screenshot({ 
      path: `screenshots/login_filled_${getTimestamp()}.png`,
      fullPage: true 
    });

    console.log('Looking for Sign In button...');
    
    // Force click using JavaScript to bypass any overlays
    await page.evaluate(() => {
      // Try multiple ways to find the button
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
      const signInButton = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('sign') || 
        btn.textContent.toLowerCase().includes('login') ||
        btn.textContent.includes('登录')
      );
      
      if (signInButton) {
        console.log('Found button:', signInButton.textContent);
        signInButton.click();
      } else {
        // Try to submit form directly
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        }
      }
    });

    console.log('Waiting for response...');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Screenshot after login attempt
    await page.screenshot({ 
      path: `screenshots/login_after_${getTimestamp()}.png`,
      fullPage: true 
    });

    console.log('Check the screenshots and browser window.');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
  }
}

loginToOurvend();