const { chromium } = require('playwright');
const { login } = require('./modules/common/login');
const fs = require('fs');
const path = require('path');

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
  constructor(machineConfig) {
    this.machineConfig = machineConfig;
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

    await this.page.evaluate(() => {
      const slotLink = Array.from(document.querySelectorAll('a')).find(link =>
        link.getAttribute('onclick')?.includes('SetMenuLinkUrl(43')
      );
      if (slotLink) slotLink.click();
    });

    await this.page.waitForTimeout(5000);

    this.slotFrame = this.page.frames().find(frame =>
      frame.url().includes('Selection/Index')
    );

    if (!this.slotFrame) {
      throw new Error('Could not find slot management iframe');
    }

    console.log('✓ In slot management iframe');
  }

  /**
   * Waits for slots to load on the page by checking for Edit buttons
   * @param {number} maxWaitSeconds - Maximum seconds to wait
   * @returns {Promise<boolean>} True if slots loaded
   */
  async waitForSlotsToLoad(maxWaitSeconds = 15) {
    console.log('Waiting for slots to load...');

    for (let i = 0; i < maxWaitSeconds; i++) {
      await this.slotFrame.waitForTimeout(1000);

      const hasSlots = await this.slotFrame.evaluate(() => {
        // Check both <button> and <a> tags
        const elements = document.querySelectorAll('button, a');
        for (const element of elements) {
          const onclick = element.getAttribute('onclick');
          if (onclick && onclick.includes('Modal_User')) {
            return true;
          }
        }
        return false;
      });

      if (hasSlots) {
        console.log(`✓ Slots loaded after ${i + 1} seconds`);
        return true;
      }
    }

    console.log(`⚠️  Slots did not load after ${maxWaitSeconds} seconds`);
    return false;
  }

  async selectMachine() {
    console.log('\n=== SELECTING MACHINE ===');
    console.log(`  Machine: ${this.machineConfig.machineName}`);
    console.log(`  Machine Grouping: ${this.machineConfig.machineGrouping}`);

    // Select machine grouping
    await this.selectDropdownOption(0, this.machineConfig.machineGrouping);

    // Select machine name
    await this.selectDropdownOption(1, this.machineConfig.machineName);

    // Click Query button
    await this.slotFrame.evaluate(() => {
      const queryBtn = document.querySelector('a[onclick="Search()"]');
      if (queryBtn) queryBtn.click();
    });

    console.log('✓ Query executed');

    // Wait for slots to appear
    await this.waitForSlotsToLoad();
  }

  async selectDropdownOption(dropdownIndex, optionText) {
    await this.slotFrame.evaluate((index) => {
      const buttons = document.querySelectorAll('button.dropdown-toggle');
      if (buttons[index]) buttons[index].click();
    }, dropdownIndex);

    await this.slotFrame.waitForTimeout(1000);

    const found = await this.slotFrame.evaluate((text) => {
      const items = document.querySelectorAll('.dropdown-menu.open li a, .dropdown-menu.show li a');
      for (const item of items) {
        if (item.textContent.includes(text)) {
          item.click();
          return true;
        }
      }
      return false;
    }, optionText);

    if (!found) {
      throw new Error(`Could not find dropdown option: ${optionText}`);
    }

    await this.slotFrame.waitForTimeout(1000);
  }

  /**
   * Finds the edit button for a specific slot by searching for onclick attribute
   * @param {number} slotNumber - The slot number to find
   * @returns {Promise<{found: boolean, onclick?: string, searchPattern?: string, availablePatterns?: string[], allOnclicks?: string[], editButtons?: any[]}>}
   */
  async findSlotEditButtonByOnclick(slotNumber) {
    const result = await this.slotFrame.evaluate((slotNum) => {
      const searchPattern = `Modal_User('${slotNum}',`;

      // Search both <button> and <a> tags
      const allElements = document.querySelectorAll('button, a');

      // Collect ALL onclick attributes for debugging
      const allOnclicks = [];
      const modalUserPatterns = [];
      const editButtons = [];

      for (const element of allElements) {
        const onclick = element.getAttribute('onclick');
        const elementText = element.textContent?.trim().toLowerCase();

        if (onclick) {
          allOnclicks.push(onclick);

          if (onclick.includes('Modal_User')) {
            modalUserPatterns.push(onclick);
          }

          if (onclick.includes(searchPattern)) {
            return {
              found: true,
              onclick: onclick
            };
          }
        }

        // Collect Edit buttons/links info
        if (elementText === 'edit' || elementText === '编辑' || elementText.includes('edit')) {
          editButtons.push({
            tag: element.tagName.toLowerCase(),
            text: elementText,
            onclick: onclick || 'no onclick',
            className: element.className,
            id: element.id || 'no id'
          });
        }
      }

      return {
        found: false,
        searchPattern: searchPattern,
        availablePatterns: modalUserPatterns.slice(0, 10),
        allOnclicks: allOnclicks.slice(0, 20),
        editButtons: editButtons.slice(0, 10)
      };
    }, slotNumber);

    return result;
  }

  /**
   * Clicks the edit button for a specific slot
   * @param {number} slotNumber - The slot number to edit
   */
  async clickSlotEditButton(slotNumber) {
    await this.slotFrame.evaluate((slotNum) => {
      const searchPattern = `Modal_User('${slotNum}',`;

      // Search both <button> and <a> tags
      const allElements = document.querySelectorAll('button, a');

      for (const element of allElements) {
        const onclick = element.getAttribute('onclick');
        if (onclick && onclick.includes(searchPattern)) {
          element.click();
          return;
        }
      }
    }, slotNumber);

    await this.slotFrame.waitForTimeout(2000);
  }

  /**
   * Verifies that the opened modal is for the expected slot number
   * @param {number} expectedSlotNumber - The expected slot number
   * @returns {Promise<{isCorrect: boolean, actual: string, expected: string}>}
   */
  async verifyOpenedSlotNumber(expectedSlotNumber) {
    const actualSlotNumber = await this.slotFrame.evaluate(() => {
      const slotInput = document.querySelector('#SiCoilId');
      if (!slotInput) return null;
      return slotInput.value;
    });

    return {
      isCorrect: actualSlotNumber === expectedSlotNumber.toString(),
      actual: actualSlotNumber,
      expected: expectedSlotNumber.toString()
    };
  }

  /**
   * Opens the edit modal for a specific slot with retry logic and verification
   * @param {number} slotNumber - The slot number to open for editing
   * @throws {Error} If slot cannot be opened after max attempts
   */
  async openSlotForEditing(slotNumber) {
    console.log(`\n=== OPENING SLOT ${slotNumber} ===`);

    const maxFindAttempts = 3;
    const maxVerifyAttempts = 3;
    let buttonSearch = null;

    // Step 1: Try to find the button with retries and sleep
    for (let findAttempt = 1; findAttempt <= maxFindAttempts; findAttempt++) {
      if (findAttempt > 1) {
        console.log(`  Retry ${findAttempt}/${maxFindAttempts}: Searching for button again...`);
        await this.slotFrame.waitForTimeout(3000); // Wait 3 seconds before retry
      }

      buttonSearch = await this.findSlotEditButtonByOnclick(slotNumber);

      if (buttonSearch.found) {
        console.log(`✓ Found button: ${buttonSearch.onclick}`);
        break;
      }

      console.log(`  Button not found, waiting...`);
    }

    // If still not found after retries, show debug info and throw
    if (!buttonSearch || !buttonSearch.found) {
      console.log(`❌ Could not find button for slot ${slotNumber} after ${maxFindAttempts} attempts`);
      console.log(`  Searched for: ${buttonSearch?.searchPattern}`);

      if (buttonSearch?.editButtons && buttonSearch.editButtons.length > 0) {
        console.log(`  Edit buttons found on page:`);
        buttonSearch.editButtons.forEach((btn, i) => {
          console.log(`    ${i + 1}. text="${btn.text}", onclick="${btn.onclick}"`);
        });
      } else {
        console.log(`  No Edit buttons found`);
      }

      if (buttonSearch?.availablePatterns && buttonSearch.availablePatterns.length > 0) {
        console.log(`  Modal_User buttons:`);
        buttonSearch.availablePatterns.forEach((pattern, i) => {
          console.log(`    ${i + 1}. ${pattern}`);
        });
      }

      throw new Error(`Slot ${slotNumber} not found in slot list`);
    }

    // Step 2: Try to click and verify with retries
    for (let verifyAttempt = 1; verifyAttempt <= maxVerifyAttempts; verifyAttempt++) {
      if (verifyAttempt > 1) {
        console.log(`  Verification retry ${verifyAttempt}/${maxVerifyAttempts}...`);
      }

      // Click the edit button
      await this.clickSlotEditButton(slotNumber);

      // Verify the correct slot opened
      const verification = await this.verifyOpenedSlotNumber(slotNumber);

      if (verification.isCorrect) {
        console.log(`✓ Verified: Slot ${slotNumber} modal opened correctly`);
        return;
      }

      console.log(`❌ Wrong slot opened! Expected ${verification.expected}, got ${verification.actual}`);

      // Close the wrong modal and retry
      await this.closeModal();
      await this.slotFrame.waitForTimeout(1000);
    }

    throw new Error(`Failed to open correct slot ${slotNumber} after ${maxVerifyAttempts} attempts - slot number mismatch`);
  }

  /**
   * Finds the Clear LINK for a specific slot by searching for onclick attribute
   *
   * IMPORTANT: The Clear element is a LINK (<a> tag), NOT a button!
   * Example HTML: <a href="#" class="btn btn-danger" role="button" onclick="Clear('7','2503060046','')">Clear</a>
   *
   * The onclick pattern is: Clear('SLOT_NUMBER','SERIAL_NUMBER','')
   * We search for the beginning of the pattern: Clear('7',
   *
   * @param {number} slotNumber - The slot number to find
   * @returns {Promise<{found: boolean, onclick?: string, element?: string}>}
   */
  async findSlotClearLinkByOnclick(slotNumber) {
    console.log(`\n  🔍 Searching for Clear LINK with pattern: Clear('${slotNumber}',`);

    const result = await this.slotFrame.evaluate((slotNum) => {
      const searchPattern = `Clear('${slotNum}',`;

      // Search for <a> tags (Clear is a LINK, not a button!)
      const allLinks = document.querySelectorAll('a');

      const allClearLinks = [];
      const allOnclicksWithClear = [];

      for (const link of allLinks) {
        const onclick = link.getAttribute('onclick');
        const linkText = link.textContent?.trim();

        if (onclick) {
          // Collect all Clear-related onclick patterns for debugging
          if (onclick.toLowerCase().includes('clear')) {
            allOnclicksWithClear.push(onclick);
          }

          // Check if this is the Clear link for our slot
          if (onclick.includes(searchPattern)) {
            return {
              found: true,
              onclick: onclick,
              element: `<a href="${link.href}" class="${link.className}" onclick="${onclick}">${linkText}</a>`
            };
          }
        }

        // Collect all Clear links for debugging
        if (linkText?.toLowerCase().includes('clear') || linkText === '清除') {
          allClearLinks.push({
            text: linkText,
            onclick: onclick || 'no onclick',
            className: link.className,
            href: link.href
          });
        }
      }

      return {
        found: false,
        searchPattern: searchPattern,
        allClearLinks: allClearLinks.slice(0, 10),
        allOnclicksWithClear: allOnclicksWithClear.slice(0, 10)
      };
    }, slotNumber);

    if (result.found) {
      console.log(`  ✓ Found Clear link: ${result.element}`);
    } else {
      console.log(`  ❌ Clear link NOT found!`);
    }

    return result;
  }

  /**
   * Clicks the Clear LINK for a specific slot
   *
   * IMPORTANT: This clicks a LINK (<a> tag), NOT a button!
   * Example: <a href="#" onclick="Clear('7','2503060046','')">Clear</a>
   *
   * NOTE: Clicking this link triggers a NATIVE JavaScript confirm() dialog
   *
   * @param {number} slotNumber - The slot number to clear
   */
  async clickSlotClearLink(slotNumber) {
    console.log(`  🖱️  Clicking Clear link for slot ${slotNumber}...`);

    await this.slotFrame.evaluate((slotNum) => {
      const searchPattern = `Clear('${slotNum}',`;

      // Search for <a> tags (Clear is a LINK!)
      const allLinks = document.querySelectorAll('a');

      for (const link of allLinks) {
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes(searchPattern)) {
          link.click();
          return;
        }
      }
    }, slotNumber);

    // Small wait for the native confirm() dialog to appear
    await this.slotFrame.waitForTimeout(500);
  }

  /**
   * Handles the NATIVE JavaScript confirm() dialog that appears when clearing a slot
   *
   * IMPORTANT: This is a NATIVE browser confirm() dialog, NOT an HTML modal!
   * It cannot be found in the DOM - we must use Playwright's dialog event handler.
   *
   * MANDATORY: This dialog MUST appear with the expected text
   * Expected dialog text: "Are you really sure you want to empty? Please confirm"
   * Expected type: confirm (with OK/Cancel buttons)
   *
   * @returns {Promise<{found: boolean, message?: string}>}
   * @throws {Error} If confirmation dialog not found or doesn't have expected text
   */
  async confirmClearDialog() {
    console.log(`\n  ⏳ Waiting for NATIVE JavaScript confirm() dialog...`);

    return new Promise((resolve, reject) => {
      let dialogHandled = false;
      const timeout = setTimeout(() => {
        if (!dialogHandled) {
          reject(new Error('VALIDATION FAILED: Native confirm() dialog did not appear within 5 seconds'));
        }
      }, 5000);

      // Set up dialog handler for native JavaScript confirm()
      const dialogHandler = async (dialog) => {
        dialogHandled = true;
        clearTimeout(timeout);

        const dialogType = dialog.type();
        const dialogMessage = dialog.message();

        console.log(`  📋 Native dialog detected!`);
        console.log(`    Type: ${dialogType}`);
        console.log(`    Message: "${dialogMessage}"`);

        // MANDATORY VALIDATION: Dialog MUST be a confirm dialog
        if (dialogType !== 'confirm') {
          this.page.off('dialog', dialogHandler);
          reject(new Error(`VALIDATION FAILED: Expected confirm dialog, got ${dialogType}`));
          return;
        }

        // MANDATORY VALIDATION: Dialog MUST have expected text
        const messageLower = dialogMessage.toLowerCase();
        const hasExpectedText = messageLower.includes('empty') ||
                               messageLower.includes('sure') ||
                               messageLower.includes('confirm');

        if (!hasExpectedText) {
          this.page.off('dialog', dialogHandler);
          reject(new Error(`VALIDATION FAILED: Dialog message "${dialogMessage}" does not contain expected text`));
          return;
        }

        console.log(`  ✓ CONFIRMATION DIALOG VALIDATED`);
        console.log(`    Accepting dialog (clicking OK)...`);

        // Accept the dialog (click OK)
        await dialog.accept();

        console.log(`  ✓ Dialog accepted`);

        // Remove the handler after use
        this.page.off('dialog', dialogHandler);

        resolve({ found: true, message: dialogMessage });
      };

      // Register the dialog handler
      this.page.on('dialog', dialogHandler);
    });
  }

  /**
   * Waits for and closes the "Clear success" message box
   *
   * MANDATORY: This success message MUST appear
   * Expected message: "Clearsuccess" or "Clear success"
   * Expected button: "Close" or "OK"
   *
   * @throws {Error} If success message not found
   */
  async closeClearSuccessMessageBox() {
    console.log(`\n  ⏳ Waiting for success message...`);
    await this.slotFrame.waitForTimeout(2000);

    // Take screenshot to see what's on screen
    await this.page.screenshot({
      path: `screenshots/clear_success_search_${getTimestamp()}.png`,
      fullPage: true
    });

    const result = await this.slotFrame.evaluate(() => {
      const modals = document.querySelectorAll('.modal, [class*="modal"]');
      const debugInfo = {
        visibleModals: 0,
        modalTexts: [],
        allButtons: [],
        checkedModals: []
      };

      for (const modal of modals) {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          debugInfo.visibleModals++;
          const text = (modal.textContent || '').trim();
          const textLower = text.toLowerCase().replace(/\s+/g, ''); // Remove all whitespace

          // Store short version for debugging
          const shortText = text.substring(0, 150).replace(/\s+/g, ' ');
          if (shortText.length > 0) {
            debugInfo.modalTexts.push(shortText);
          }

          const buttons = modal.querySelectorAll('button');
          for (const button of buttons) {
            const btnText = button.textContent?.trim();
            if (btnText) {
              debugInfo.allButtons.push(btnText);
            }
          }

          // Look for "Clearsuccess" (one word) or "Clear success" or variations
          const hasSuccessMessage = textLower.includes('clearsuccess') ||
                                   (textLower.includes('clear') && textLower.includes('success')) ||
                                   textLower.includes('successfully') ||
                                   textLower.includes('成功'); // Chinese for success

          debugInfo.checkedModals.push({
            text: shortText,
            hasSuccess: hasSuccessMessage,
            textLower: textLower.substring(0, 100)
          });

          if (hasSuccessMessage) {
            for (const button of buttons) {
              const btnText = button.textContent?.trim().toLowerCase();
              if (btnText === 'close' || btnText === 'ok' ||
                  btnText === '关闭' || btnText === 'submit') {
                button.click();
                return {
                  found: true,
                  message: shortText,
                  buttonClicked: btnText
                };
              }
            }
          }
        }
      }
      return { found: false, debugInfo };
    });

    // MANDATORY VALIDATION: Success message MUST be found
    if (!result.found) {
      console.log(`\n❌ VALIDATION FAILED: Success message "Clearsuccess" NOT FOUND`);
      if (result.debugInfo) {
        console.log(`  Debug: ${result.debugInfo.visibleModals} visible modals`);
        if (result.debugInfo.checkedModals.length > 0) {
          console.log(`\n  Checked modals for success message:`);
          result.debugInfo.checkedModals.forEach((m, i) => {
            console.log(`    ${i + 1}. hasSuccess=${m.hasSuccess}, text="${m.text}"`);
            console.log(`       textLower="${m.textLower}"`);
          });
        }
        if (result.debugInfo.allButtons.length > 0) {
          console.log(`  Buttons in visible modals: ${result.debugInfo.allButtons.join(', ')}`);
        }
      }
      console.log(`\n  Screenshot saved to: screenshots/clear_success_search_${getTimestamp()}.png`);
      throw new Error('VALIDATION FAILED: Success message "Clearsuccess" not found');
    }

    console.log(`  ✓ SUCCESS MESSAGE VALIDATED`);
    console.log(`    Button clicked: "${result.buttonClicked}"`);
    console.log(`    Message text: "${result.message}"`);

    await this.slotFrame.waitForTimeout(1000);
  }

  /**
   * Clears a slot by clicking the Clear LINK
   *
   * IMPORTANT: Clear is implemented as a LINK (<a> tag), NOT a button!
   * Example HTML: <a href="#" class="btn btn-danger" role="button" onclick="Clear('7','2503060046','')">Clear</a>
   *
   * Process:
   * 1. Find and click the Clear link
   * 2. Confirm the clear action in the dialog
   * 3. Close the success message
   *
   * @param {number} slotNumber - The slot number to clear
   * @throws {Error} If Clear link cannot be found
   */
  async clearSlot(slotNumber) {
    console.log(`\n=== CLEARING SLOT ${slotNumber} ===`);
    console.log(`NOTE: Clear is a LINK (<a> tag), not a button!`);

    const maxFindAttempts = 3;
    let linkSearch = null;

    // Try to find the Clear LINK with retries
    for (let findAttempt = 1; findAttempt <= maxFindAttempts; findAttempt++) {
      if (findAttempt > 1) {
        console.log(`  Retry ${findAttempt}/${maxFindAttempts}: Searching for Clear link...`);
        await this.slotFrame.waitForTimeout(3000);
      }

      linkSearch = await this.findSlotClearLinkByOnclick(slotNumber);

      if (linkSearch.found) {
        console.log(`✓ FOUND Clear link: ${linkSearch.onclick}`);
        break;
      }

      console.log(`  Clear link not found, waiting...`);
    }

    // VALIDATION: Ensure the Clear link was found
    if (!linkSearch || !linkSearch.found) {
      console.log(`\n❌ VALIDATION FAILED: Could not find Clear link for slot ${slotNumber}`);
      console.log(`  Searched for onclick pattern: ${linkSearch?.searchPattern}`);

      if (linkSearch?.allClearLinks && linkSearch.allClearLinks.length > 0) {
        console.log(`\n  Clear links found on page:`);
        linkSearch.allClearLinks.forEach((link, i) => {
          console.log(`    ${i + 1}. text="${link.text}", onclick="${link.onclick}", class="${link.className}"`);
        });
      } else {
        console.log(`  ⚠️  No Clear links found on page`);
      }

      if (linkSearch?.allOnclicksWithClear && linkSearch.allOnclicksWithClear.length > 0) {
        console.log(`\n  All onclick attributes containing 'clear':`);
        linkSearch.allOnclicksWithClear.forEach((onclick, i) => {
          console.log(`    ${i + 1}. ${onclick}`);
        });
      }

      throw new Error(`VALIDATION FAILED: Clear link not found for slot ${slotNumber}`);
    }

    console.log(`✓ VALIDATION PASSED: Clear link exists and will be clicked`);

    // Step 1: Set up dialog handler BEFORE clicking (native dialogs happen immediately)
    const confirmPromise = this.confirmClearDialog();

    // Step 2: Click the Clear LINK (this triggers the native confirm() dialog)
    await this.clickSlotClearLink(slotNumber);
    console.log('✓ Clicked Clear link');

    // Step 3: Wait for and handle the native confirmation dialog
    const confirmResult = await confirmPromise;
    console.log(`✓ Confirmation dialog handled: "${confirmResult.message}"`);

    // Step 4: Wait for and close "Clear success" message box
    await this.closeClearSuccessMessageBox();

    console.log(`✓ Successfully cleared Slot ${slotNumber}`);
  }

  /**
   * Orchestrates the complete update process for a single slot
   * @param {Object} slotConfig - The slot configuration object
   * @returns {Promise<{success: boolean, slot: number, productName?: string, error?: string, productNotFound?: boolean}>}
   */
  async updateSlot(slotConfig) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing Slot ${slotConfig.slotNumber}: ${slotConfig.productName || '(CLEAR SLOT)'}`);
    console.log('='.repeat(60));

    try {
      // Check if we need to clear the slot (empty product name)
      if (!slotConfig.productName || slotConfig.productName.trim() === '') {
        await this.clearSlot(slotConfig.slotNumber);
        console.log(`✓ Successfully cleared Slot ${slotConfig.slotNumber}`);
        return { success: true, slot: slotConfig.slotNumber };
      }

      // Step 1: Open the slot edit modal
      await this.openSlotForEditing(slotConfig.slotNumber);

      // Step 2: Update product if needed
      const productChanged = await this.updateSlotProduct(slotConfig.productName);

      // Step 3: Update prices
      const pricesChanged = await this.updateSlotPrices(slotConfig);

      // Step 4: Save or close modal
      const anyChanges = productChanged || pricesChanged;

      if (anyChanges) {
        await this.submitModal();
        await this.closeSuccessModal();
      } else {
        await this.closeModal();
      }

      console.log(`✓ Successfully updated Slot ${slotConfig.slotNumber}`);
      return { success: true, slot: slotConfig.slotNumber };

    } catch (error) {
      console.error(`❌ Failed to update Slot ${slotConfig.slotNumber}: ${error.message}`);

      // Check if error is due to product not found
      const isProductNotFound = error.message.includes('Could not find product');

      return {
        success: false,
        slot: slotConfig.slotNumber,
        productName: slotConfig.productName,
        error: error.message,
        productNotFound: isProductNotFound
      };
    }
  }

  /**
   * Gets the currently selected product name from the modal
   * @returns {Promise<string|null>} The current product name or null if not found
   */
  async getCurrentProductName() {
    return await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return null;

      const productDropdown = modal.querySelector('button.dropdown-toggle');
      if (!productDropdown) return null;

      return productDropdown.textContent?.trim() || null;
    });
  }

  /**
   * Selects a product from the dropdown in the modal
   * @param {string} productName - The product name to select
   * @returns {Promise<boolean>} True if product was found and selected
   */
  async selectProductInDropdown(productName) {
    return await this.slotFrame.evaluate(async (productName) => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return false;

      const productDropdown = modal.querySelector('button.dropdown-toggle');
      if (!productDropdown) return false;

      productDropdown.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const items = document.querySelectorAll('.dropdown-menu.open li a, .dropdown-menu.show li a');

      for (const item of items) {
        if (item.textContent.includes(productName)) {
          item.click();
          return true;
        }
      }

      return false;
    }, productName);
  }

  /**
   * Updates the slot's product if it doesn't match the expected product
   * @param {string} expectedProductName - The product name that should be selected
   * @returns {Promise<boolean>} True if product was changed, false if already correct
   * @throws {Error} If product cannot be found or selected
   */
  async updateSlotProduct(expectedProductName) {
    console.log('\n=== CHECKING PRODUCT ===');

    const currentProduct = await this.getCurrentProductName();

    if (!currentProduct) {
      throw new Error('Could not find product dropdown in modal');
    }

    if (currentProduct.includes(expectedProductName)) {
      console.log(`✓ Product already correct`);
      return false;
    }

    console.log(`  Current: "${currentProduct}"`);
    console.log(`  Expected: "${expectedProductName}"`);

    const selected = await this.selectProductInDropdown(expectedProductName);

    if (!selected) {
      throw new Error(`Could not find product: ${expectedProductName}`);
    }

    console.log(`✓ Changed product to "${expectedProductName}"`);
    await this.slotFrame.waitForTimeout(1000);
    return true;
  }

  /**
   * Gets the current machine price value from the modal
   * @returns {Promise<string|null>} The current machine price
   */
  async getMachinePriceValue() {
    return await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return null;

      const machinePrice = modal.querySelector('#SiPrice');
      return machinePrice ? machinePrice.value : null;
    });
  }

  /**
   * Gets the current user-defined price value from the modal
   * @returns {Promise<string|null>} The current user-defined price
   */
  async getUserDefinedPriceValue() {
    return await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return null;

      const userDefinedPrice = modal.querySelector('#SiCustomPrice');
      return userDefinedPrice ? userDefinedPrice.value : null;
    });
  }

  /**
   * Sets the machine price value in the modal
   * @param {number} price - The price to set
   */
  async setMachinePriceValue(price) {
    await this.slotFrame.evaluate((price) => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (modal) {
        const machinePrice = modal.querySelector('#SiPrice');
        if (machinePrice) {
          machinePrice.value = price.toString();
          machinePrice.dispatchEvent(new Event('input', { bubbles: true }));
          machinePrice.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, price);
  }

  /**
   * Sets the user-defined price value in the modal
   * @param {number} price - The price to set
   */
  async setUserDefinedPriceValue(price) {
    await this.slotFrame.evaluate((price) => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (modal) {
        const userDefinedPrice = modal.querySelector('#SiCustomPrice');
        if (userDefinedPrice) {
          userDefinedPrice.value = price.toString();
          userDefinedPrice.dispatchEvent(new Event('input', { bubbles: true }));
          userDefinedPrice.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, price);
  }

  /**
   * Updates both machine and user-defined prices for a slot
   * @param {Object} slotConfig - The slot configuration with price values
   * @returns {Promise<boolean>} True if any prices were changed, false if already correct
   */
  async updateSlotPrices(slotConfig) {
    console.log('\n=== UPDATING PRICES ===');

    let pricesChanged = false;

    // Check and update machine price
    const currentMachinePrice = await this.getMachinePriceValue();
    const expectedMachinePrice = slotConfig.machinePrice.toString();

    if (currentMachinePrice !== expectedMachinePrice) {
      console.log(`  Machine price: ${currentMachinePrice} → ${expectedMachinePrice}`);
      await this.setMachinePriceValue(slotConfig.machinePrice);
      pricesChanged = true;
    }

    // Check and update user-defined price
    const currentUserPrice = await this.getUserDefinedPriceValue();
    const expectedUserPrice = slotConfig.userDefinedPrice.toString();

    if (currentUserPrice !== expectedUserPrice) {
      console.log(`  User-defined price: ${currentUserPrice} → ${expectedUserPrice}`);
      await this.setUserDefinedPriceValue(slotConfig.userDefinedPrice);
      pricesChanged = true;
    }

    console.log(pricesChanged ? '✓ Prices updated' : '✓ Prices already correct');

    return pricesChanged;
  }

  /**
   * Finds the currently visible modal element
   * @returns {Promise<boolean>} True if a visible modal exists
   */
  async findVisibleModal() {
    return await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      return modal !== undefined;
    });
  }

  /**
   * Closes the currently open modal without saving
   */
  async closeModal() {
    await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (modal) {
        const buttons = Array.from(modal.querySelectorAll('button'));
        for (const button of buttons) {
          const text = button.textContent?.trim().toLowerCase();
          if (text === 'close' || text === 'cancel') {
            button.click();
            return;
          }
        }
      }
    });

    console.log('✓ Closed modal');
    await this.slotFrame.waitForTimeout(1000);
  }

  /**
   * Submits the currently open modal to save changes
   */
  async submitModal() {
    console.log('Submitting changes...');
    await this.slotFrame.waitForTimeout(1000);

    await this.slotFrame.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (modal) {
        const buttons = Array.from(modal.querySelectorAll('button, input[type="submit"]'));
        for (const button of buttons) {
          const text = button.textContent?.trim().toLowerCase();
          if (text === 'submit' || text === 'save') {
            button.click();
            return;
          }
        }
      }
    });

    console.log('✓ Submitted');
  }

  /**
   * Closes the success confirmation modal that appears after saving
   */
  async closeSuccessModal() {
    await this.slotFrame.waitForTimeout(2000);

    await this.slotFrame.evaluate(() => {
      const modals = document.querySelectorAll('.modal, [class*="modal"]');

      for (const modal of modals) {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const text = modal.textContent || '';
          if (text.includes('successfully')) {
            const buttons = modal.querySelectorAll('button');
            for (const button of buttons) {
              const btnText = button.textContent?.trim().toLowerCase();
              if (btnText === 'close' || btnText === 'ok') {
                button.click();
                return;
              }
            }
          }
        }
      }
    });

    console.log('✓ Closed success modal');
    await this.slotFrame.waitForTimeout(1000);
  }

  async closeBrowser() {
    await this.page.waitForTimeout(2000);
    await this.browser.close();
  }
}

// Main execution
async function main() {
  const configFile = process.argv[2];

  if (!configFile) {
    console.error('Usage: node sync-machine-to-cloud.js <config-file>');
    console.error('Example: node sync-machine-to-cloud.js machine-7-config.json');
    process.exit(1);
  }

  if (!fs.existsSync(configFile)) {
    console.error(`Error: Config file not found: ${configFile}`);
    process.exit(1);
  }

  // Start timer
  const startTime = Date.now();

  console.log(`\n${'='.repeat(70)}`);
  console.log('MACHINE SYNC TO OURVEND CLOUD');
  console.log('='.repeat(70));
  console.log(`Config file: ${configFile}\n`);

  const machineConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

  console.log('Machine Details:');
  console.log(`  ID: ${machineConfig.machineId}`);
  console.log(`  Name: ${machineConfig.machineName}`);
  console.log(`  Grouping: ${machineConfig.machineGrouping}`);
  console.log(`  Serial: ${machineConfig.serial}`);
  console.log(`  Total slots to sync: ${machineConfig.slots.length}\n`);

  const updater = new SlotUpdater(machineConfig);

  try {
    await updater.initialize();
    await updater.loginToSystem();
    await updater.navigateToSlotManagement();
    await updater.selectMachine();

    console.log('\n✓ Browser ready, starting slot updates...\n');

    const results = {
      successful: [],
      failed: [],
      productsNotFound: []  // Track products not found in dropdown
    };

    for (const slotConfig of machineConfig.slots) {
      const result = await updater.updateSlot(slotConfig);

      if (result.success) {
        results.successful.push(result.slot);
      } else {
        results.failed.push(result);

        // Track products not found separately
        if (result.productNotFound) {
          results.productsNotFound.push({
            slot: result.slot,
            productName: result.productName
          });
        }
      }

      await updater.page.waitForTimeout(1000);
    }

    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationSec = Math.floor(durationMs / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;

    console.log(`\n${'='.repeat(70)}`);
    console.log('SYNC SUMMARY');
    console.log('='.repeat(70));
    console.log(`Machine: ${machineConfig.machineName}`);
    console.log(`Duration: ${minutes}m ${seconds}s (${durationSec} seconds)`);
    console.log(`✓ Successfully synced: ${results.successful.length} slots`);
    if (results.successful.length > 0) {
      console.log(`  Slots: ${results.successful.join(', ')}`);
    }
    console.log(`❌ Failed: ${results.failed.length} slots`);
    if (results.failed.length > 0) {
      results.failed.forEach(f => {
        console.log(`  Slot ${f.slot}: ${f.error}`);
      });
    }

    // Display products not found
    if (results.productsNotFound.length > 0) {
      console.log(`\n⚠️  PRODUCTS NOT FOUND IN DROPDOWN (${results.productsNotFound.length} total):`);
      console.log('='.repeat(70));
      results.productsNotFound.forEach(item => {
        console.log(`  Slot ${item.slot}: "${item.productName}"`);
      });
    }

    console.log('='.repeat(70));

    await updater.closeBrowser();

  } catch (error) {
    console.error('Fatal error:', error);
    if (updater.browser) {
      await updater.browser.close();
    }
    throw error;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SlotUpdater };
