const { addCommodity } = require('./add-commodity');

async function test() {
  try {
    console.log('=== TESTING COMMODITY ADDITION ===\n');
    
    // Test 1: Add with default values
    console.log('Test 1: Adding commodity with default values...');
    const result1 = await addCommodity();
    
    console.log('\nPress Enter to close browser and continue...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    await result1.browser.close();
    
    // Test 2: Add with custom values
    console.log('\nTest 2: Adding commodity with custom values...');
    const result2 = await addCommodity({
      code: 'TEST-' + Date.now(),
      name: 'Test Product ' + new Date().toLocaleTimeString(),
      specs: 'Test Specification',
      unitPrice: '9.99',
      costPrice: '5.99'
    });
    
    console.log('\nPress Ctrl+C to exit...');
    await new Promise(() => {}); // Keep browser open
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Enable stdin
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();

test().catch(console.error);