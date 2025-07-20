# TCN Spaeti - Ourvend Automation

Browser automation suite for Ourvend vending machine management platform using Playwright. This project provides an API bridge between ERP systems and Ourvend by automating web interactions.

## 🎯 Purpose

- Automate product/commodity management in vending machines
- Synchronize prices and inventory from ERP to Ourvend
- Export sales data from Ourvend for ERP import
- Eliminate manual data entry and reduce errors

## 📁 Project Structure

```
tcn-spaeti/
├── modules/
│   ├── common/              # Shared functionality
│   │   ├── login.js         # Authentication handler
│   │   └── CLAUDE.md        # Module documentation
│   ├── commodity-management/ # Product management
│   │   ├── add-commodity.js # Add new products
│   │   ├── test-add-commodity.js
│   │   └── CLAUDE.md        # Module documentation
│   ├── sales-reports/       # (Coming soon)
│   └── inventory/           # (Coming soon)
├── screenshots/             # Debug screenshots (git-ignored)
├── package.json
├── README.md
└── CLAUDE.md               # AI assistant context

```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm installed

### Installation
```bash
git clone https://github.com/kaza/tcn-spaeti.git
cd tcn-spaeti
npm install
```

### Basic Usage

#### Add a New Product
```javascript
const { addCommodity } = require('./modules/commodity-management/add-commodity');

// Add with auto-generated values
await addCommodity();

// Add with custom values
await addCommodity({
  code: '123456789',
  name: 'Coca Cola 500ml',
  specs: '500ml bottle',
  unitPrice: '3.50',
  costPrice: '2.00'
});
```

## 🔧 Key Features

### ✅ Implemented
- Automated login with credential management
- Navigate to Commodity Management section
- Add new products with all required fields
- Handle iframe-based page structure
- Screenshot capture for debugging

### 🚧 Coming Soon
- Edit existing products
- Bulk import from CSV/Excel
- Sales report extraction
- Inventory synchronization
- Scheduled automation
- REST API wrapper

## 📝 Documentation

Each module has its own `CLAUDE.md` file with:
- Technical implementation details
- Common issues and solutions
- Code examples
- AI assistant context

## 🐛 Debugging Tips

1. **Run with visible browser**: Scripts run with `headless: false` by default
2. **Check screenshots**: Saved in `screenshots/` with timestamps
3. **Slow down execution**: Increase `slowMo` value in browser launch
4. **Check for iframes**: Commodity pages load in iframes!

## ⚠️ Important Notes

- The Ourvend platform uses iframes extensively
- Page load times can be slow (5-10 seconds)
- Some content loads dynamically via AJAX
- Chinese and English interfaces are mixed

## 🤝 Contributing

When adding new features:
1. Create a new module directory
2. Include a `CLAUDE.md` for AI assistants
3. Add test scripts
4. Update this README

## 📄 License

ISC