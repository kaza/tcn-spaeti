export interface SlotConfiguration {
  slotNumber: number;
  productName: string;
  machinePrice: number;
  userDefinedPrice: number;
  capacity: number;
  existing: number;
  weChatDiscount: number;
  alipayDiscount: number;
  idCardDiscount: number;
  alertingQuantity: string | number;
}

export class SlotManager {
  private configurations: SlotConfiguration[];

  constructor(configurations: SlotConfiguration[]) {
    this.configurations = configurations;
  }

  getConfiguration(slotNumber: number): SlotConfiguration | undefined {
    return this.configurations.find(config => config.slotNumber === slotNumber);
  }

  async updateSlot(page: any, slotFrame: any, config: SlotConfiguration): Promise<boolean> {
    console.log(`\n=== UPDATING SLOT ${config.slotNumber} ===`);
    
    // Find and click the Edit button for the specific slot
    const slotFound = await this.findAndClickSlot(slotFrame, config.slotNumber);
    if (!slotFound) {
      console.error(`❌ Could not find Slot ${config.slotNumber}`);
      return false;
    }

    // Wait for modal to open
    await slotFrame.waitForTimeout(3000);

    // Validate and update all fields
    const validationResult = await this.validateAndUpdateFields(slotFrame, config);
    
    if (validationResult.allCorrect) {
      console.log('✓ All values are correct, clicking Close button');
      await this.clickCloseButton(slotFrame);
    } else {
      console.log('⚠️ Some values need updating, clicking Submit button');
      console.log('Differences found:', validationResult.differences);
      await this.clickSubmitButton(slotFrame);
    }

    return true;
  }

  private async findAndClickSlot(slotFrame: any, slotNumber: number): Promise<boolean> {
    return await slotFrame.evaluate((targetSlot: number) => {
      const editButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
        btn.textContent?.trim() === 'Edit'
      );
      
      // For slot 1, use the first edit button (index 0)
      // For other slots, you'd need to parse the slot number from the container
      if (targetSlot === 1 && editButtons.length > 0) {
        editButtons[0].click();
        return true;
      }
      
      // TODO: Implement logic for other slot numbers
      return false;
    }, slotNumber);
  }

  private async validateAndUpdateFields(slotFrame: any, config: SlotConfiguration): Promise<{allCorrect: boolean, differences: string[]}> {
    return await slotFrame.evaluate((expectedConfig: SlotConfiguration) => {
      const modal = Array.from(document.querySelectorAll('.modal, [class*="modal"]')).find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (!modal) return { allCorrect: false, differences: ['Modal not found'] };

      const differences: string[] = [];
      let allCorrect = true;

      // Helper function to find input by label or name
      const findInput = (labelText: string, alternativeSelectors: string[] = []): HTMLInputElement | null => {
        // Try by label
        const labels = Array.from(modal.querySelectorAll('label'));
        for (const label of labels) {
          if (label.textContent?.toLowerCase().includes(labelText.toLowerCase())) {
            const input = label.parentElement?.querySelector('input, select') || 
                         modal.querySelector(`#${label.getAttribute('for')}`);
            if (input) return input as HTMLInputElement;
          }
        }

        // Try alternative selectors
        for (const selector of alternativeSelectors) {
          const input = modal.querySelector(selector) as HTMLInputElement;
          if (input) return input;
        }

        return null;
      };

      // Check and update Product Name
      const productDropdown = modal.querySelector('button.dropdown-toggle');
      const currentProduct = productDropdown?.textContent?.trim() || '';
      if (!currentProduct.includes(expectedConfig.productName)) {
        differences.push(`Product: "${currentProduct}" → "${expectedConfig.productName}"`);
        allCorrect = false;
        // TODO: Implement product change logic
      }

      // Field mappings
      const fieldMappings = [
        { name: 'Machine Price', value: expectedConfig.machinePrice, selectors: ['input[name*="price"]', 'input[placeholder*="price"]'] },
        { name: 'User-defined price', value: expectedConfig.userDefinedPrice, selectors: ['input[name*="user"]', 'input[name*="defined"]'] },
        { name: 'Capacity', value: expectedConfig.capacity, selectors: ['input[name*="capacity"]', 'input[placeholder*="capacity"]'] },
        { name: 'Existing', value: expectedConfig.existing, selectors: ['input[name*="existing"]', 'input[placeholder*="existing"]'] },
        { name: 'WeChat discount', value: expectedConfig.weChatDiscount, selectors: ['input[name*="wechat"]', 'input[name*="WeChat"]'] },
        { name: 'Alipay discount', value: expectedConfig.alipayDiscount, selectors: ['input[name*="alipay"]', 'input[name*="Alipay"]'] },
        { name: 'ID card discount', value: expectedConfig.idCardDiscount, selectors: ['input[name*="card"]', 'input[name*="ID"]'] },
        { name: 'Alerting quantity', value: expectedConfig.alertingQuantity, selectors: ['input[name*="alert"]', 'input[placeholder*="alert"]'] }
      ];

      // Check and update each field
      for (const field of fieldMappings) {
        const input = findInput(field.name, field.selectors);
        if (input) {
          const currentValue = input.value;
          const expectedValue = field.value.toString();
          
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
          allCorrect = false;
        }
      }

      return { allCorrect, differences };
    }, config);
  }

  private async clickCloseButton(slotFrame: any): Promise<boolean> {
    return await slotFrame.evaluate(() => {
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
  }

  private async clickSubmitButton(slotFrame: any): Promise<boolean> {
    return await slotFrame.evaluate(() => {
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
  }
}