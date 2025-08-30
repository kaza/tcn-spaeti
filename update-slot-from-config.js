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
    console.log('Waiting for slots to load...');
    await this.slotFrame.waitForTimeout(8000);
    
    // Debug: Check what's on the page
    const pageInfo = await this.slotFrame.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button, a'));
      const editButtons = allButtons.filter(btn => btn.textContent?.trim() === 'Edit').length;
      const anySlotText = document.body.textContent.includes('Slot number');
      const firstFewSlots = [];
      
      // Look for slot text
      const allText = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.includes('Slot number') && !el.children.length
      );
      
      allText.slice(0, 5).forEach(el => {
        firstFewSlots.push(el.textContent.trim());
      });
      
      return { editButtons, anySlotText, firstFewSlots };
    });
    console.log(`Page loaded with ${pageInfo.editButtons} Edit buttons`);
    console.log(`Contains "Slot number": ${pageInfo.anySlotText}`);
    if (pageInfo.firstFewSlots.length > 0) {
      console.log('First few slots found:', pageInfo.firstFewSlots);
    }
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
      // Find all elements containing text
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Look for "Slot numberX" text
      const targetText = `Slot number${slotNum}`;
      console.log(`Looking for: "${targetText}"`);
      
      // Find the element containing our slot text
      let slotContainer = null;
      for (const element of allElements) {
        const text = element.textContent || '';
        // Check if this element contains our slot text but not as part of a larger number
        if (text.includes(targetText) && 
            !text.includes(`Slot number${slotNum}0`) && 
            !text.includes(`Slot number${slotNum}1`) &&
            !text.includes(`Slot number${slotNum}2`) &&
            !text.includes(`Slot number${slotNum}3`) &&
            !text.includes(`Slot number${slotNum}4`) &&
            !text.includes(`Slot number${slotNum}5`) &&
            !text.includes(`Slot number${slotNum}6`) &&
            !text.includes(`Slot number${slotNum}7`) &&
            !text.includes(`Slot number${slotNum}8`) &&
            !text.includes(`Slot number${slotNum}9`)) {
          
          // Check if this is the smallest container with the text
          const childrenWithText = Array.from(element.children).filter(child => 
            child.textContent?.includes(targetText)
          );
          
          if (childrenWithText.length === 0) {
            slotContainer = element;
            break;
          }
        }
      }
      
      if (!slotContainer) {
        console.log(`Could not find container for ${targetText}`);
        return false;
      }
      
      console.log(`Found slot container for ${targetText}`);
      
      // Now find the Edit button within or near this container
      let container = slotContainer;
      let depth = 0;
      let editButton = null;
      
      while (container && depth < 10) {
        // Look for Edit button within this container
        const buttons = Array.from(container.querySelectorAll('button, a')).filter(btn => 
          btn.textContent?.trim() === 'Edit'
        );
        
        if (buttons.length > 0) {
          editButton = buttons[0];
          break;
        }
        
        // Go up to parent
        container = container.parentElement;
        depth++;
      }
      
      if (editButton) {
        console.log(`Found Edit button for ${targetText}`);
        editButton.click();
        return true;
      }
      
      console.log(`Could not find Edit button for ${targetText}`);
      return false;
    }, slotNumber);
    
    if (!slotClicked) {
      throw new Error(`Could not find Slot number${slotNumber}`);
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
        
        let selectedItem = null;
        for (const item of items) {
          if (item.textContent.includes(expectedProductName)) {
            console.log(`Found product: ${item.textContent}`);
            selectedItem = item;
            item.click();
            
            // Force Bootstrap Select to update
            const event = new Event('click', { bubbles: true });
            item.dispatchEvent(event);
            
            // Also try to find and update the select element if it exists
            const hiddenSelect = modal.querySelector('select');
            if (hiddenSelect) {
              // Find the option that matches
              for (let i = 0; i < hiddenSelect.options.length; i++) {
                if (hiddenSelect.options[i].text.includes(expectedProductName)) {
                  hiddenSelect.selectedIndex = i;
                  hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
            }
            
            break;
          }
        }
        
        if (selectedItem) {
          return { success: true, changed: true, oldProduct: currentProduct, newProduct: expectedProductName };
        }
        
        return { success: false, error: `Could not find product: ${expectedProductName}` };
      }
      
      return { success: true, changed: false, currentProduct };
    }, expectedProductName);
    
    if (productChangeResult.changed) {
      console.log(`✓ Changed product from "${productChangeResult.oldProduct}" to "${productChangeResult.newProduct}"`);
      // Wait longer for dropdown to update
      await this.slotFrame.waitForTimeout(3000);
      
      // Verify the product actually changed
      const verifyResult = await this.slotFrame.evaluate(() => {
        const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        if (!modal) return { error: 'Modal not found' };
        
        const productDropdown = modal.querySelector('button.dropdown-toggle');
        return {
          currentText: productDropdown?.textContent?.trim() || '',
          innerHTML: productDropdown?.innerHTML || ''
        };
      });
      
      console.log('After change verification:');
      console.log(`  Button text: "${verifyResult.currentText}"`);
      console.log(`  Button HTML: ${verifyResult.innerHTML.substring(0, 100)}...`);
      
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
      // First, let's see all modals
      const allModals = document.querySelectorAll('.modal, [class*="modal"]');
      console.log(`Total modals found: ${allModals.length}`);
      
      // Find the edit modal (not the success modal)
      let modal = null;
      for (const m of allModals) {
        const style = window.getComputedStyle(m);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const modalText = m.textContent || '';
          // Skip success modals
          if (!modalText.includes('Edited successfully') && !modalText.includes('Message Box')) {
            // Check if it has form fields
            const hasInputs = m.querySelectorAll('input').length > 0;
            if (hasInputs) {
              modal = m;
              console.log('Found edit modal with inputs');
              break;
            }
          }
        }
      }

      if (!modal) {
        console.log('Could not find edit modal with inputs');
        return { allCorrect: false, differences: ['Edit modal not found'], fieldValues: {} };
      }

      const differences = [];
      const fieldValues = {};
      let allCorrect = true;

      // Record current product - get the first dropdown (product dropdown)
      const productDropdown = modal.querySelector('button.dropdown-toggle');
      const currentProduct = productDropdown?.textContent?.trim() || '';
      fieldValues.productName = currentProduct;
      console.log(`Current product in dropdown: "${currentProduct}"`);

      // Field mappings - use the exact IDs we know
      const machinePrice = modal.querySelector('#SiPrice');
      const userDefinedPrice = modal.querySelector('#SiCustomPrice');
      
      console.log(`Machine Price input found: ${!!machinePrice}, current value: "${machinePrice?.value}"`);
      console.log(`User-defined Price input found: ${!!userDefinedPrice}, current value: "${userDefinedPrice?.value}"`);
      
      const fieldMappings = [
        { 
          name: 'Machine Price', 
          value: expectedConfig.machinePrice, 
          input: machinePrice
        },
        { 
          name: 'User-defined price', 
          value: expectedConfig.userDefinedPrice, 
          input: userDefinedPrice
        }
      ];

      // Find all inputs in modal for debugging
      const allInputs = modal.querySelectorAll('input');
      console.log(`Found ${allInputs.length} inputs in modal`);
      
      // Debug: log all input details
      allInputs.forEach((input, idx) => {
        const style = window.getComputedStyle(input);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
        console.log(`Input ${idx}: name="${input.name}", id="${input.id}", placeholder="${input.placeholder}", type="${input.type}", value="${input.value}", visible=${isVisible}`);
      });

      // Also look for inputs by traversing from labels
      console.log('\n=== CHECKING LABELS AND THEIR INPUTS ===');
      const allLabels = modal.querySelectorAll('label');
      allLabels.forEach((label, idx) => {
        const labelText = label.textContent?.trim() || '';
        const forAttr = label.getAttribute('for');
        let associatedInput = null;
        
        if (forAttr) {
          associatedInput = modal.querySelector(`#${forAttr}`);
        } else {
          // Check next sibling or within parent
          associatedInput = label.nextElementSibling || label.parentElement?.querySelector('input');
        }
        
        if (associatedInput) {
          console.log(`Label ${idx}: "${labelText}" -> Input: name="${associatedInput.name}", value="${associatedInput.value}"`);
        } else {
          console.log(`Label ${idx}: "${labelText}" -> No associated input found`);
        }
      });

      // Check and update each field
      for (const field of fieldMappings) {
        const input = field.input;
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
            console.log(`Updated ${field.name} from "${currentValue}" to "${expectedValue}"`);
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
      console.log('Waiting 2 seconds after clicking Close...');
      await this.slotFrame.waitForTimeout(2000);
      await this.takeScreenshot('after_close_button');
    } else {
      console.log('⚠️ Could not find success message Close button');
      console.log('Waiting 2 seconds to check for any modals...');
      await this.slotFrame.waitForTimeout(2000);
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

  async setupBrowserAndNavigate() {
    await this.initialize();
    await this.loginToSystem();
    await this.navigateToSlotManagement();
    await this.selectMachine();
  }

  async updateSingleSlot() {
    try {
      await this.openSlotForEditing(this.config.slotNumber);
      
      await this.takeScreenshot(`slot_${this.config.slotNumber}_before_validation`);
      
      // Update product if needed
      await this.changeProductIfNeeded(this.config.productName);
      
      // Validate and update other fields
      const validationResult = await this.validateAndUpdateFormFields(this.config);
      
      await this.takeScreenshot(`slot_${this.config.slotNumber}_after_validation`);
      
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
      
      await this.takeScreenshot(`slot_${this.config.slotNumber}_final_state`);
      
    } catch (error) {
      // Re-throw the error to be handled by the main loop
      throw error;
    }
  }
}

// Main execution
async function main() {
  // Load configuration
  const configurations = JSON.parse(fs.readFileSync('slot-configurations.json', 'utf8'));
  
  console.log('=== SLOT UPDATE CONFIGURATION ===');
  console.log(`Total slots to update: ${configurations.length}`);
  console.log('');
  
  const results = {
    successful: [],
    failed: []
  };
  
  // Create a single updater instance for browser setup
  const firstConfig = configurations[0];
  const browserController = new SlotUpdater(firstConfig);
  
  try {
    // Setup browser once and navigate to the correct page
    console.log('=== SETTING UP BROWSER AND NAVIGATION ===');
    await browserController.setupBrowserAndNavigate();
    console.log('✓ Browser ready, machine selected');
    
    // Process each slot configuration
    for (const config of configurations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing Slot ${config.slotNumber}: ${config.productName}`);
      console.log('='.repeat(60));
      
      try {
        // Create updater with current config but reuse the same browser/page/frame
        const slotUpdater = new SlotUpdater(config);
        slotUpdater.browser = browserController.browser;
        slotUpdater.page = browserController.page;
        slotUpdater.slotFrame = browserController.slotFrame;
        
        await slotUpdater.updateSingleSlot();
        results.successful.push(config.slotNumber);
        console.log(`✓ Successfully updated Slot ${config.slotNumber}`);
        
        // Wait a bit between slots to let the page settle
        await slotUpdater.page.waitForTimeout(2000);
        
      } catch (error) {
        console.error(`❌ Failed to update Slot ${config.slotNumber}: ${error.message}`);
        results.failed.push({ slot: config.slotNumber, error: error.message });
        console.log('Continuing with next slot...');
        
        // Wait a bit before trying next slot
        await browserController.page.waitForTimeout(2000);
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Successfully updated: ${results.successful.length} slots`);
    if (results.successful.length > 0) {
      console.log(`  Slots: ${results.successful.join(', ')}`);
    }
    console.log(`❌ Failed: ${results.failed.length} slots`);
    if (results.failed.length > 0) {
      results.failed.forEach(f => {
        console.log(`  Slot ${f.slot}: ${f.error}`);
      });
    }
    
    // Close browser at the end
    await browserController.closeBrowser();
    
  } catch (error) {
    console.error('Fatal error during setup:', error);
    if (browserController.browser) {
      await browserController.browser.close();
    }
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
module.exports = { SlotUpdater };