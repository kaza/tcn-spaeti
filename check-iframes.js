const { chromium } = require('playwright');

async function checkIframes() {
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
    
    console.log('\n=== CHECKING FOR IFRAMES ===\n');
    
    // Check main page for iframes
    const iframeInfo = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe, frame');
      console.log(`Found ${iframes.length} iframes`);
      
      // Highlight iframes
      iframes.forEach((iframe, index) => {
        iframe.style.border = '5px solid red';
      });
      
      return Array.from(iframes).map((iframe, index) => ({
        index: index,
        src: iframe.src,
        id: iframe.id,
        name: iframe.name,
        className: iframe.className,
        width: iframe.width,
        height: iframe.height
      }));
    });
    
    console.log(`Found ${iframeInfo.length} iframes on main page:`);
    iframeInfo.forEach(iframe => {
      console.log(`\nIframe #${iframe.index}:`);
      console.log(`  src: ${iframe.src}`);
      console.log(`  id: ${iframe.id}`);
      console.log(`  name: ${iframe.name}`);
    });
    
    // Check each iframe for content
    console.log('\n=== CHECKING IFRAME CONTENTS ===\n');
    
    const frames = page.frames();
    console.log(`Total frames (including main): ${frames.length}`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      console.log(`\nFrame ${i}: ${frame.url()}`);
      
      try {
        // Check if this frame has the commodity content
        const hasContent = await frame.evaluate(() => {
          const text = document.body ? document.body.textContent : '';
          return {
            hasCommodityInfo: text.includes('Commodity info') || text.includes('Commodity code'),
            hasAddButton: text.includes('Add'),
            bodyText: text.substring(0, 200)
          };
        });
        
        if (hasContent.hasCommodityInfo || hasContent.hasAddButton) {
          console.log('  ✓ THIS FRAME HAS COMMODITY CONTENT!');
          console.log(`  Contains "Commodity info": ${hasContent.hasCommodityInfo}`);
          console.log(`  Contains "Add": ${hasContent.hasAddButton}`);
          
          // Try to find Add button in this frame
          const addButton = await frame.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const addLink = links.find(link => {
              const text = link.textContent || '';
              const onclick = link.getAttribute('onclick') || '';
              return text.includes('Add') || onclick.includes('Modal_User');
            });
            
            if (addLink) {
              addLink.style.border = '10px solid green';
              addLink.style.backgroundColor = 'yellow';
              return {
                found: true,
                text: addLink.textContent,
                onclick: addLink.getAttribute('onclick'),
                html: addLink.outerHTML
              };
            }
            
            return { found: false };
          });
          
          if (addButton.found) {
            console.log('\n  ✅ FOUND ADD BUTTON IN THIS FRAME!');
            console.log(`  Text: ${addButton.text}`);
            console.log(`  OnClick: ${addButton.onclick}`);
            console.log(`  HTML: ${addButton.html}`);
            
            // Click it!
            console.log('\n  Clicking Add button in iframe...');
            await frame.click('a:has-text("Add")');
            console.log('  ✓ Clicked!');
          }
        } else {
          console.log(`  Preview: ${hasContent.bodyText.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`  Error checking frame: ${e.message}`);
      }
    }
    
    // Alternative: Try to switch context to main content area
    console.log('\n=== LOOKING FOR MAIN CONTENT AREA ===');
    
    const contentArea = await page.evaluate(() => {
      // Common selectors for main content areas
      const selectors = ['#main-content', '.main-content', '#content', '.content', 
                        '[role="main"]', 'main', '#frame-content', '.frame-content'];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          element.style.border = '3px solid purple';
          return {
            found: true,
            selector: selector,
            text: element.textContent.substring(0, 100)
          };
        }
      }
      
      return { found: false };
    });
    
    if (contentArea.found) {
      console.log(`Found main content area: ${contentArea.selector}`);
    }
    
    console.log('\n\nIframes are highlighted in RED');
    console.log('If Add button found, it\'s highlighted in GREEN/YELLOW');
    console.log('\nBrowser remains open. Press Ctrl+C to exit...');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

checkIframes().catch(console.error);