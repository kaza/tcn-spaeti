const { chromium } = require('playwright');
const { login } = require('../common/login');

const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

async function navigateToSlotManagement() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500 // Extra slow to observe navigation
  });

  try {
    const page = await browser.newPage();
    
    // Step 1: Login
    await login(page);
    
    console.log('\n=== STEP 1: LOOKING FOR VENDING MACHINE MANAGEMENT ===');
    
    // First, we need to find and click "Vending machine management" to expand it
    const vendingMgmtClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('span, a, li'));
      const vendingMgmt = elements.find(el => {
        const text = el.textContent || '';
        return text.includes('Vending machine management') || 
               text.includes('vending machine') ||
               text.includes('售货机管理'); // Chinese version
      });
      
      if (vendingMgmt) {
        console.log('Found Vending machine management:', vendingMgmt.tagName);
        vendingMgmt.style.border = '3px solid red';
        vendingMgmt.style.backgroundColor = 'yellow';
        vendingMgmt.click();
        
        // Also try clicking parent
        if (vendingMgmt.parentElement) {
          vendingMgmt.parentElement.click();
        }
        return true;
      }
      return false;
    });
    
    if (vendingMgmtClicked) {
      console.log('✓ Clicked Vending machine management');
    } else {
      console.log('✗ Could not find Vending machine management');
    }
    
    // Wait for submenu to expand
    await page.waitForTimeout(3000);
    
    // Take screenshot of expanded menu
    await page.screenshot({ 
      path: `screenshots/slot_mgmt_menu_expanded_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n=== STEP 2: LOOKING FOR SLOT MANAGEMENT ===');
    
    // Now look for Slot management link
    const slotMgmtInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const results = [];
      
      links.forEach(link => {
        const text = link.textContent || '';
        const onclick = link.getAttribute('onclick') || '';
        
        if (text.includes('Slot management') || 
            text.includes('slot') ||
            onclick.includes('Selection/Index') ||
            onclick.includes('43')) {
          
          link.style.border = '5px solid green';
          link.style.backgroundColor = 'lime';
          
          results.push({
            text: text.trim(),
            onclick: onclick,
            href: link.href,
            found: true
          });
        }
      });
      
      return results;
    });
    
    console.log('Found slot management links:', slotMgmtInfo);
    
    // Click the slot management link
    console.log('\n=== STEP 3: CLICKING SLOT MANAGEMENT ===');
    
    const slotClicked = await page.evaluate(() => {
      // Look for the specific link with SetMenuLinkUrl(43,...)
      const links = Array.from(document.querySelectorAll('a'));
      const slotLink = links.find(link => {
        const onclick = link.getAttribute('onclick') || '';
        return onclick.includes('SetMenuLinkUrl(43') || 
               (link.textContent && link.textContent.includes('Slot management'));
      });
      
      if (slotLink) {
        console.log('Clicking slot management link');
        slotLink.click();
        return true;
      }
      
      return false;
    });
    
    if (slotClicked) {
      console.log('✓ Clicked Slot management link');
    } else {
      console.log('✗ Could not click Slot management');
      
      // Try calling SetMenuLinkUrl directly
      console.log('Trying to call SetMenuLinkUrl directly...');
      await page.evaluate(() => {
        if (typeof SetMenuLinkUrl === 'function') {
          SetMenuLinkUrl(43, "Slot management", "/Selection/Index", false);
        }
      });
    }
    
    // Wait for page to load
    console.log('\nWaiting for slot management page to load...');
    await page.waitForTimeout(5000);
    
    // Check if we need to look for an iframe (like commodity management)
    console.log('\n=== STEP 4: CHECKING FOR IFRAME ===');
    
    const iframeInfo = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      const results = [];
      
      iframes.forEach(iframe => {
        results.push({
          id: iframe.id,
          src: iframe.src,
          name: iframe.name
        });
        
        // Highlight iframes
        iframe.style.border = '5px solid purple';
      });
      
      return results;
    });
    
    console.log('Found iframes:', iframeInfo);
    
    // Check if there's an iframe with id="43" (matching the SetMenuLinkUrl parameter)
    const slotFrame = page.frames().find(frame => 
      frame.url().includes('Selection/Index')
    );
    
    if (slotFrame) {
      console.log('✓ Found slot management iframe!');
      console.log('  URL:', slotFrame.url());
      
      // Explore what's in the iframe
      const slotContent = await slotFrame.evaluate(() => {
        const content = {
          title: document.title,
          headers: [],
          buttons: [],
          forms: [],
          tables: []
        };
        
        // Find headers
        document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
          content.headers.push(h.textContent.trim());
        });
        
        // Find buttons
        document.querySelectorAll('button, input[type="button"], a.btn').forEach(btn => {
          const text = btn.textContent || btn.value || '';
          if (text.trim()) {
            content.buttons.push(text.trim());
          }
        });
        
        // Find forms
        content.forms = document.querySelectorAll('form').length;
        
        // Find tables
        content.tables = document.querySelectorAll('table').length;
        
        return content;
      });
      
      console.log('\n=== SLOT MANAGEMENT PAGE CONTENT ===');
      console.log('Headers:', slotContent.headers);
      console.log('Buttons:', slotContent.buttons);
      console.log('Forms count:', slotContent.forms);
      console.log('Tables count:', slotContent.tables);
      
    } else {
      console.log('✗ No slot management iframe found');
      
      // Check main page content
      const mainContent = await page.evaluate(() => {
        return {
          pageText: document.body.textContent.substring(0, 500),
          currentUrl: window.location.href
        };
      });
      
      console.log('\nMain page content preview:', mainContent.pageText);
      console.log('Current URL:', mainContent.currentUrl);
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: `screenshots/slot_management_page_${getTimestamp()}.png`,
      fullPage: true 
    });
    
    console.log('\n✓ Screenshot saved');
    console.log('\nBrowser remains open for inspection.');
    console.log('Press Ctrl+C to exit...');
    
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { navigateToSlotManagement };

// Run if called directly
if (require.main === module) {
  navigateToSlotManagement().catch(console.error);
}