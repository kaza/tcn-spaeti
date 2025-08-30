const { chromium } = require('playwright');
const { login } = require('./modules/common/login');
const fs = require('fs');

const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

class SlotUpdater {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.slotFrame = null;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 1000
    });
    this.page = await this.browser.newPage();
  }

  async loginToSystem() {
    console.log('=== LOGGING IN ===');
    await login(this.page);
  }

  async navigateToSlotManagement() {
    console.log('\n=== NAVIGATING TO SLOT MANAGEMENT ===');
    
    // Click on Vending machine management
    await this.page.evaluate(() => {
      const vendingMgmt = Array.from(document.querySelectorAll('span')).find(el => 
        el.textContent?.includes('Vending machine management')
      );
      if (vendingMgmt) {
        vendingMgmt.click();
        if (vendingMgmt.parentElement) vendingMgmt.parentElement.click();
      }
    });
    
    await this.page.waitForTimeout(2000);
    
    // Click on Slot management link
    await this.page.evaluate(() => {
      const slotLink = Array.from(document.querySelectorAll('a')).find(link => 
        link.getAttribute('onclick')?.includes('SetMenuLinkUrl(43')
      );
      if (slotLink) slotLink.click();
    });
    
    await this.page.waitForTimeout(5000);
    
    // Find slot management iframe
    this.slotFrame = this.page.frames().find(frame => 
      frame.url().includes('Selection/Index')
    );
    
    if (!this.slotFrame) {
      throw new Error('Could not find slot management iframe');
    }
    
    console.log('✓ In slot management iframe');
  }

  async selectMachine(grouping = '1050', machineId = 'Cips (5) 250306') {
    console.log('\n=== SELECTING MACHINE ===');
    console.log(`  Machine grouping: ${grouping}`);
    console.log(`  Machine ID: ${machineId}`);
    
    // Select machine grouping
    await this.selectDropdownOption(0, grouping);
    
    // Select machine ID
    await this.selectDropdownOption(1, machineId);
    
    // Click Query button
    await this.slotFrame.evaluate(() => {
      const queryBtn = document.querySelector('a[onclick="Search()"]');
      if (queryBtn) queryBtn.click();
    });
    
    console.log('✓ Query executed');
    await this.slotFrame.waitForTimeout(5000);
  }

  async selectDropdownOption(dropdownIndex, optionText) {
    // Click dropdown button
    await this.slotFrame.evaluate((index) => {
      const buttons = document.querySelectorAll('button.dropdown-toggle');
      if (buttons[index]) buttons[index].click();
    }, dropdownIndex);
    
    await this.slotFrame.waitForTimeout(1000);
    
    // Select option
    await this.slotFrame.evaluate((text) => {
      const items = document.querySelectorAll('.dropdown-menu.open li a');
      for (const item of items) {
        if (item.textContent.includes(text)) {
          item.click();
          break;
        }
      }
    }, optionText);
    
    await this.slotFrame.waitForTimeout(1000);
  }

  async openSlotForEditing(slotNumber) {
    console.log(`\n=== OPENING SLOT ${slotNumber} FOR EDITING ===`);
    
    const slotClicked = await this.slotFrame.evaluate((slotNum) => {
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      
      if (slotNum === 1 && editButtons.length > 0) {
        editButtons[0].click();
        return true;
      }
      return false;
    }, slotNumber);
    
    if (!slotClicked) {
      throw new Error(`Could not find Slot ${slotNumber}`);
    }
    
    console.log(`✓ Opened Slot ${slotNumber} for editing`);
    await this.slotFrame.waitForTimeout(3000);
  }

  async changeProductIfNeeded(expectedProductName) {
    console.log('\n=== CHECKING PRODUCT ===');
    
    const productChangeResult = await this.slotFrame.evaluate(async (expectedProductName) => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return { success: false, error: 'Modal not found' };

      const productDropdown = modal.querySelector('button.dropdown-toggle');
      if (!productDropdown) return { success: false, error: 'Product dropdown not found' };

      const currentProduct = productDropdown.textContent?.trim() || '';
      console.log(`Current product: "${currentProduct}"`);
      console.log(`Expected product: "${expectedProductName}"`);

      if (!currentProduct.includes(expectedProductName)) {
        console.log('Product needs to be changed');
        
        // Click the dropdown
        productDropdown.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for the product in dropdown
        const items = document.querySelectorAll('.dropdown-menu.open li a, .dropdown-menu.show li a');
        console.log(`Found ${items.length} dropdown items`);
        
        for (const item of items) {
          if (item.textContent.includes(expectedProductName)) {
            console.log(`Found product: ${item.textContent}`);
            item.click();
            return { success: true, changed: true, oldProduct: currentProduct, newProduct: expectedProductName };
          }
        }
        
        return { success: false, error: `Could not find product: ${expectedProductName}` };
      }
      
      return { success: true, changed: false, currentProduct };
    }, expectedProductName);
    
    if (productChangeResult.changed) {
      console.log(`✓ Changed product from "${productChangeResult.oldProduct}" to "${productChangeResult.newProduct}"`);
      await this.slotFrame.waitForTimeout(2000);
    } else if (productChangeResult.success && !productChangeResult.changed) {
      console.log(`✓ Product already correct: "${productChangeResult.currentProduct}"`);
    } else {
      console.log(`❌ Failed to change product: ${productChangeResult.error}`);
    }
    
    return productChangeResult;
  }

  async validateAndUpdateFormFields(config) {
    console.log('\n=== VALIDATING OTHER FIELDS ===');
    
    const validationResult = await this.slotFrame.evaluate((expectedConfig) => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return { allCorrect: false, differences: ['Modal not found'], fieldValues: {} };

      const differences = [];
      const fieldValues = {};
      let allCorrect = true;

      // Helper function to find input
      const findInput = (selectors) => {
        for (const selector of selectors) {
          const input = modal.querySelector(selector);
          if (input) return input;
        }
        return null;
      };

      // Record current product
      const productDropdown = modal.querySelector('button.dropdown-toggle');
      const currentProduct = productDropdown?.textContent?.trim() || '';
      fieldValues.productName = currentProduct;

      // Field mappings
      const fieldMappings = [
        { 
          name: 'Machine Price', 
          value: expectedConfig.machinePrice, 
          selectors: ['input[name*="MachinePrice"]', 'input[name*="machinePrice"]', 'input[placeholder*="Machine Price"]']
        },
        { 
          name: 'User-defined price', 
          value: expectedConfig.userDefinedPrice, 
          selectors: ['input[name*="UserDefinedPrice"]', 'input[name*="userDefinedPrice"]', 'input[placeholder*="User-defined price"]']
        },
        { 
          name: 'Capacity', 
          value: expectedConfig.capacity, 
          selectors: ['input[name*="Capacity"]', 'input[name*="capacity"]', 'input[placeholder*="Capacity"]']
        },
        { 
          name: 'Existing', 
          value: expectedConfig.existing, 
          selectors: ['input[name*="Existing"]', 'input[name*="existing"]', 'input[placeholder*="Existing"]']
        },
        { 
          name: 'WeChat discount', 
          value: expectedConfig.weChatDiscount, 
          selectors: ['input[name*="WeChatDiscount"]', 'input[name*="weChatDiscount"]', 'input[placeholder*="WeChat discount"]']
        },
        { 
          name: 'Alipay discount', 
          value: expectedConfig.alipayDiscount, 
          selectors: ['input[name*="AlipayDiscount"]', 'input[name*="alipayDiscount"]', 'input[placeholder*="Alipay discount"]']
        },
        { 
          name: 'ID card discount', 
          value: expectedConfig.idCardDiscount, 
          selectors: ['input[name*="IDCardDiscount"]', 'input[name*="idCardDiscount"]', 'input[placeholder*="ID card discount"]']
        },
        { 
          name: 'Alerting quantity', 
          value: expectedConfig.alertingQuantity, 
          selectors: ['input[name*="AlertingQuantity"]', 'input[name*="alertingQuantity"]', 'input[placeholder*="Alerting quantity"]']
        }
      ];

      // Find all inputs in modal for debugging
      const allInputs = modal.querySelectorAll('input');
      console.log(`Found ${allInputs.length} inputs in modal`);

      // Check and update each field
      for (const field of fieldMappings) {
        const input = findInput(field.selectors);
        if (input) {
          const currentValue = input.value;
          const expectedValue = field.value.toString();
          fieldValues[field.name] = currentValue;
          
          if (currentValue !== expectedValue) {
            differences.push(`${field.name}: "${currentValue}" → "${expectedValue}"`);
            allCorrect = false;
            
            // Update the value
            input.value = expectedValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          differences.push(`${field.name}: input not found`);
          fieldValues[field.name] = 'NOT FOUND';
          allCorrect = false;
        }
      }

      return { allCorrect, differences, fieldValues };
    }, config);
    
    console.log('All values correct:', validationResult.allCorrect);
    console.log('Current field values:', validationResult.fieldValues);
    
    if (validationResult.differences.length > 0) {
      console.log('\nDifferences found:');
      validationResult.differences.forEach(diff => console.log(`  - ${diff}`));
    }
    
    return validationResult;
  }

  async clickCloseButton() {
    console.log('\n✓ All values are correct, clicking Close button');
    
    const closeClicked = await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return false;

      const buttons = Array.from(modal.querySelectorAll('button'));
      for (const button of buttons) {
        const text = button.textContent?.trim().toLowerCase();
        if (text === 'close' || text === 'cancel' || button.classList.contains('close')) {
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (closeClicked) {
      console.log('✓ Clicked Close button');
    } else {
      console.log('❌ Could not find Close button');
    }
    
    return closeClicked;
  }

  async clickSubmitButton() {
    console.log('\n⚠️ Values need updating, waiting 2 seconds before clicking Submit button');
    console.log('Waiting 2 seconds...');
    await this.page.waitForTimeout(2000);
    
    console.log('Now clicking Submit button');
    const submitClicked = await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return false;

      const buttons = Array.from(modal.querySelectorAll('button, input[type="submit"]'));
      for (const button of buttons) {
        const text = button.textContent?.trim().toLowerCase();
        if (text === 'submit' || text === 'save' || text === 'ok' || text === 'confirm') {
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (submitClicked) {
      console.log('✓ Clicked Submit button');
    } else {
      console.log('❌ Could not find Submit button');
    }
    
    return submitClicked;
  }

  async checkForSuccessMessage() {
    await this.slotFrame.waitForTimeout(3000);
    
    const result = await this.slotFrame.evaluate(() => {
      const alerts = document.querySelectorAll('.alert-success, [class*="success"]');
      if (alerts.length > 0) {
        return { success: true, message: alerts[0].textContent?.trim() };
      }
      return { success: false };
    });
    
    if (result.success) {
      console.log('✓ Changes saved successfully!');
      if (result.message) console.log(`  Message: ${result.message}`);
    }
    
    return result;
  }

  async closeSuccessModal() {
    await this.slotFrame.waitForTimeout(3000);
    console.log('Looking for success message box...');
    
    await this.takeScreenshot('before_close_button');
    
    const modalDebug = await this.debugModalState();
    console.log('Modal debug info:', JSON.stringify(modalDebug, null, 2));
    
    const closeClicked = await this.slotFrame.evaluate(() => {
      const modals = document.querySelectorAll('.modal, [class*="modal"], .popup, [class*="popup"], .alert, [class*="alert"]');
      
      for (const modal of modals) {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const text = modal.textContent || '';
          if (text.includes('Edited successfully') || text.includes('Success') || text.includes('successfully')) {
            console.log('Found success modal/popup');
            
            const buttons = modal.querySelectorAll('button, a.btn, input[type="button"]');
            for (const button of buttons) {
              const btnText = button.textContent?.trim();
              if (btnText && (btnText.toLowerCase() === 'close' || btnText.toLowerCase() === 'ok' || btnText === '关闭')) {
                console.log(`Clicking button: "${btnText}"`);
                button.click();
                return { clicked: true, buttonText: btnText };
              }
            }
          }
        }
      }
      
      return { clicked: false };
    });
    
    if (closeClicked.clicked) {
      console.log(`✓ Clicked Close button: "${closeClicked.buttonText}"`);
      console.log('Waiting 20 seconds after clicking Close...');
      await this.slotFrame.waitForTimeout(20000);
      await this.takeScreenshot('after_close_button');
    } else {
      console.log('⚠️ Could not find success message Close button');
      console.log('Waiting 20 seconds to check for any modals...');
      await this.slotFrame.waitForTimeout(20000);
    }
    
    return closeClicked;
  }

  async debugModalState() {
    return await this.slotFrame.evaluate(() => {
      const debug = {
        totalModals: 0,
        visibleModals: 0,
        modalContents: [],
        allButtons: []
      };
      
      const modals = document.querySelectorAll('.modal, [class*="modal"], .popup, [class*="popup"], .alert, [class*="alert"]');
      debug.totalModals = modals.length;
      
      modals.forEach((modal, index) => {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          debug.visibleModals++;
          
          const content = modal.textContent?.trim().substring(0, 200);
          debug.modalContents.push({
            index,
            className: modal.className,
            content,
            hasEditedSuccessfully: content.includes('Edited successfully') || content.includes('successfully')
          });
          
          const buttons = modal.querySelectorAll('button, a.btn, input[type="button"], input[type="submit"]');
          buttons.forEach(btn => {
            debug.allButtons.push({
              modalIndex: index,
              text: btn.textContent?.trim(),
              className: btn.className,
              type: btn.tagName
            });
          });
        }
      });
      
      return debug;
    });
  }

  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `screenshots/${name}_${getTimestamp()}.png`,
      fullPage: true 
    });
  }

  async closeBrowser() {
    console.log('\nWaiting 2 seconds before closing browser...');
    await this.page.waitForTimeout(2000);
    console.log('Closing browser');
    await this.browser.close();
  }

  async updateSlot() {
    try {
      await this.initialize();
      await this.loginToSystem();
      await this.navigateToSlotManagement();
      await this.selectMachine();
      await this.openSlotForEditing(this.config.slotNumber);
      
      await this.takeScreenshot('slot_before_validation');
      
      // Update product if needed
      await this.changeProductIfNeeded(this.config.productName);
      
      // Validate and update other fields
      const validationResult = await this.validateAndUpdateFormFields(this.config);
      
      await this.takeScreenshot('slot_after_validation');
      
      // Click appropriate button based on validation
      if (validationResult.allCorrect) {
        await this.clickCloseButton();
      } else {
        const submitClicked = await this.clickSubmitButton();
        
        if (submitClicked) {
          const successResult = await this.checkForSuccessMessage();
          if (successResult.success) {
            await this.closeSuccessModal();
          }
        }
      }
      
      await this.takeScreenshot('slot_final_state');
      await this.closeBrowser();
      
    } catch (error) {
      console.error('Error:', error);
      if (this.browser) {
        await this.browser.close();
      }
      throw error;
    }
  }
}

// Main execution
async function main() {
  // Load configuration
  const configurations = JSON.parse(fs.readFileSync('slot-configurations.json', 'utf8'));
  const config = configurations[0]; // Get first configuration
  
  console.log('=== SLOT UPDATE CONFIGURATION ===');
  console.log(JSON.stringify(config, null, 2));
  
  const updater = new SlotUpdater(config);
  await updater.updateSlot();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
module.exports = { SlotUpdater };