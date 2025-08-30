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

## Critical Discoveries

### 1. Iframes Everywhere
Most functional pages load inside iframes! Always check for iframes when elements aren't found:
- Commodity Info: iframe id="54"
- Look for: `page.frames()` to find all frames

### 2. Multiple Submit Buttons
Many operations require clicking multiple "Submit" buttons in sequence:
- Image crop confirmation
- Save operation
- Popup dismissals
Each has different onclick handlers or IDs

### 3. Required Image Upload
Products REQUIRE an image. Use dummy4.jpg if no real image available.

### 4. Slow Loading
Everything loads slowly. Always add waits:
- 5-7 seconds after navigation
- 3 seconds after button clicks
- 2 seconds after form fills

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

## AI Assistant Rules

### RULE #1: KEEP ANSWERS SHORT AND DIRECT
- Answer in 1-3 sentences MAX unless deep analysis requested
- Be concise but insightful
- Let user ask for more details if needed

### RULE #2: STRATEGIC THINKING MODE
- When user says "let's discuss" or "brainstorm" - engage in strategic dialogue
- Challenge assumptions constructively
- Provide multiple perspectives (investor, customer, competitor view)
- Use frameworks when helpful (SWOT, Porter's Five Forces, Jobs-to-be-Done)
- Back opinions with market data or examples when possible
- If user asks a question or wants to brainstorm - ANSWER IT and PROVIDE SUGGESTIONS
- DO NOT create code or technical implementations
- DISCUSSION means DISCUSSION, not building

### RULE #11: HIERARCHICAL DOCUMENTATION
📁 EVERY directory must have CLAUDE.md and CLAUDE-INDEX.md files

**Structure:**
- `CLAUDE.md` - Directory-specific instructions, rules, and context
- `CLAUDE-INDEX.md` - Navigation index for that directory's contents

**Example hierarchy:**
```
/strategy/
  ├── CLAUDE.md           # Strategy-specific rules
  ├── CLAUDE-INDEX.md     # Index of strategy docs
  ├── decisions/
  │   ├── CLAUDE.md       # Decision documentation rules
  │   ├── CLAUDE-INDEX.md # Index of decisions
  │   └── *.md            # Individual decision docs
```

**Requirements:**
- Root files - Overall repo rules and top-level navigation
- Directory files - Context and navigation for that specific area
- Inheritance - Subdirectory rules add to (not replace) parent rules
- Updates - When adding files, update the directory's CLAUDE-INDEX.md
- Consistency - Use same format across all CLAUDE files

### Documentation Navigation - HIERARCHICAL SYSTEM
🔍 HIERARCHICAL CLAUDE FILES - CHECK AT EVERY LEVEL!

**Navigation hierarchy:**
- Start with root `/CLAUDE-INDEX.md` - Top-level navigation
- Check directory `CLAUDE.md` - Understand that area's rules
- Use directory `CLAUDE-INDEX.md` - Navigate within that area
- Each directory is self-contained - Has its own documentation

**What each file contains:**
- Root `/CLAUDE.md` - Overall repository rules and strategy
- Root `/CLAUDE-INDEX.md` - Navigation to all major areas
- Directory `CLAUDE.md` - Specific instructions for that domain
- Directory `CLAUDE-INDEX.md` - Index of files in that directory

**CLAUDE-INDEX.md Purpose:**
- Contains short description of each file's content
- Provides direct links to files
- Should be used BEFORE searching files
- Enables quick navigation without file searching