# Project Context for AI Assistants

## Project Overview
This project provides browser automation scripts using Playwright to create an API bridge between an existing ERP system and the Ourvend vending machine management platform. The goal is to automate data synchronization for vending machine operations.

## Purpose
- **Primary Goal**: Automate the synchronization of product data and prices from ERP to Ourvend
- **Secondary Goal**: Collect sales data from Ourvend for import into the ERP system
- **Method**: Use Playwright to interact with the Ourvend web interface as if it were an API

## Key Components

### 1. Authentication
- The Ourvend platform uses JavaScript-based encryption for login
- Credentials are stored securely (not in the repository)
- Login URL: https://os.ourvend.com/Account/Login
- Successful login redirects to: https://os.ourvend.com/YSTemplet/index

### 2. Main Operations (To Be Implemented)

#### Product Management
- Navigate to product management section
- Update product prices
- Update product names and descriptions
- Set inventory levels

#### Sales Data Collection
- Navigate to sales reports
- Download transaction data
- Parse and format for ERP import

#### Machine Management
- Access individual vending machine settings
- Update configuration as needed

## Technical Architecture

### Current Implementation
- **Language**: JavaScript/Node.js
- **Browser Automation**: Playwright
- **Authentication**: Automated login with credential management

### Planned Implementation
- **Data Pipeline**: 
  - ERP → CSV/JSON → Playwright Script → Ourvend Web Interface
  - Ourvend Reports → Playwright Script → CSV/JSON → ERP
- **Scheduling**: To be implemented (cron jobs or similar)
- **Error Handling**: Retry logic for failed operations
- **Logging**: Transaction logs for audit trail

## Development Guidelines

### When Adding New Features
1. Always maintain the existing login flow
2. Take screenshots at key steps for debugging
3. Implement proper error handling and retries
4. Log all operations for audit purposes
5. Keep credentials and sensitive data out of the codebase

### Testing
- Test scripts in headless: false mode first
- Verify data accuracy before automating
- Always have rollback procedures

### Screenshot Rules
**IMPORTANT**: Always take screenshots before and after actions for troubleshooting.

1. **Directory**: All screenshots must be saved in the `screenshots/` directory
2. **Naming Convention**: `{action}_{before|after}_{timestamp}.png`
   - Example: `login_before_20250120_143022.png`
   - Example: `update_price_after_20250120_143045.png`
3. **Timestamp Format**: `YYYYMMDD_HHMMSS` (24-hour format)
4. **Required Screenshots**:
   - Before and after login
   - Before and after any data update
   - On any error or unexpected state
   - Before and after navigation to new sections

Example implementation:
```javascript
const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
};

// Before action
await page.screenshot({ 
  path: `screenshots/update_price_before_${getTimestamp()}.png`,
  fullPage: true 
});

// ... perform action ...

// After action
await page.screenshot({ 
  path: `screenshots/update_price_after_${getTimestamp()}.png`,
  fullPage: true 
});
```

## Important URLs and Selectors
- Login Page: https://os.ourvend.com/Account/Login
- Username Field: #userName
- Password Field: #passWord
- Dashboard: https://os.ourvend.com/YSTemplet/index

## Future Enhancements
- API endpoint creation for ERP integration
- Batch processing for multiple machines
- Real-time synchronization
- Automated reporting and alerts
- Multi-tenant support

## Notes for AI Assistants
- The Ourvend platform does not provide a REST API, hence the browser automation approach
- The platform uses Chinese and English interfaces
- Some operations may require handling of dynamic content and AJAX requests
- Always preserve the existing authentication mechanism when modifying scripts