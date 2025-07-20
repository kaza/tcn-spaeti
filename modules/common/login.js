const { chromium } = require('playwright');

async function login(page) {
  console.log('Logging in to Ourvend...');
  
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
  console.log('✓ Logged in successfully');
  
  return page;
}

module.exports = { login };