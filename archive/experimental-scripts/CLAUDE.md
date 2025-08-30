# Archive - Experimental Scripts

## Purpose
This directory contains early experimental scripts and development iterations that were created during the discovery phase of the project. These scripts are preserved for historical reference and to understand the evolution of the solution.

## Important Note
**These scripts are NOT production-ready.** They were stepping stones to understanding Ourvend's complex interface. For production use, refer to the organized modules in `/modules/`.

## Why These Scripts Exist
During development, we faced several challenges:
1. **Iframe Discovery** - Initially couldn't find elements until we discovered the iframe architecture
2. **Multiple Submit Buttons** - Had to experiment to understand the three-submit pattern
3. **Bootstrap Select** - Tried multiple approaches before finding the working method
4. **Slow Page Loads** - Experimented with different wait strategies

## Script Categories

### Login Iterations
- Various approaches to handle the encrypted login process
- Different wait strategies and error handling attempts

### Commodity Management Experiments
- Multiple attempts to add commodities
- Different approaches to handle the modal interactions
- Various timing strategies (slow, step-by-step, interactive)

### Debug Tools
- Scripts created to understand the page structure
- Tools to find elements and analyze the DOM
- Iframe investigation utilities

## Lessons Learned
These scripts taught us:
1. Always check for iframes when elements aren't found
2. Some operations require multiple sequential button clicks
3. Bootstrap Select needs special handling
4. Timing is critical - everything loads slowly
5. Modals can stack and need proper dismissal

## For Production Use
Don't use these scripts directly. Instead, use:
- `/modules/commodity-management/` - For product operations
- `/modules/slot-management/` - For slot configuration
- `/modules/common/` - For shared utilities

These experimental scripts remain as a record of the discovery process and may be useful for understanding edge cases or debugging new issues.