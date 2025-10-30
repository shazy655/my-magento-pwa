# Configurable Product Cart Update Summary

## Overview
Updated the `addConfigurableProductsToCart` mutation to use a simpler format that doesn't require passing `configurable_options`. Magento automatically derives the selected options from the child SKU.

## Changes Made

### 1. Simplified GraphQL Mutation (`src/services/magentoApi.js`)

#### Before:
```graphql
mutation AddConfigurableToCart(
  $cartId: String!, 
  $parentSku: String!, 
  $childSku: String!, 
  $quantity: Float!, 
  $selectedOptions: [ConfigurableProductOptionsInput!]!
) {
  addConfigurableProductsToCart(
    input: {
      cart_id: $cartId
      cart_items: [
        {
          parent_sku: $parentSku
          data: {
            sku: $childSku
            quantity: $quantity
          }
          configurable_options: $selectedOptions  # ← Removed
        }
      ]
    }
  ) {
    cart {
      items {
        id
        product { name sku }
        quantity
        ... on ConfigurableCartItem {
          configurable_options {
            id
            option_label
            value_label
          }
        }
      }
    }
  }
}
```

#### After:
```graphql
mutation AddConfigurableToCart(
  $cartId: String!, 
  $parentSku: String!, 
  $childSku: String!, 
  $quantity: Float!
) {
  addConfigurableProductsToCart(
    input: {
      cart_id: $cartId
      cart_items: [
        {
          parent_sku: $parentSku
          data: {
            sku: $childSku
            quantity: $quantity
          }
        }
      ]
    }
  ) {
    cart {
      items {
        id
        product { name sku }
        quantity
        ... on ConfigurableCartItem {
          configurable_options {
            id
            option_label
            value_label
          }
        }
      }
    }
  }
}
```

### 2. Updated Method Signatures

#### `addConfigurableProductToCart()`
**Before:**
```javascript
async addConfigurableProductToCart(parentSku, childSku, quantity = 1, selectedOptions = [])
```

**After:**
```javascript
async addConfigurableProductToCart(parentSku, childSku, quantity = 1)
```

#### `addToGuestCart()`
- Removed option formatting logic
- Marked `selectedOptions` parameter as deprecated
- Simplified the configurable product code path

**Before:**
```javascript
// Format options to match Magento's expected format
const formattedOptions = selectedOptions.map(opt => ({
  option_id: opt.id || opt.option_id,
  option_value: opt.value_index || opt.option_value
}));
return await this.addConfigurableProductToCart(parentSku, sku, quantity, formattedOptions);
```

**After:**
```javascript
// No need to pass configurable_options - Magento derives them from the child SKU
return await this.addConfigurableProductToCart(parentSku, sku, quantity);
```

## Usage Example

### JavaScript API Call
```javascript
// Add a configurable product (e.g., Red T-Shirt, Size 29) to cart
await magentoApi.addToGuestCart(
  'WSH11-29-Red',        // Child SKU (variant SKU)
  2,                      // Quantity
  'ConfigurableProduct',  // Product type
  [],                     // selectedOptions (deprecated, can be empty array)
  'WSH11'                 // Parent SKU (configurable product)
);
```

### Direct GraphQL Mutation
```graphql
mutation {
  addConfigurableProductsToCart(
    input: {
      cart_id: "QeUDqgzHOcpEqIWad0XmKYk9SOBsdWQF"
      cart_items: [
        {
          parent_sku: "WSH11"
          data: {
            sku: "WSH11-29-Red"
            quantity: 2
          }
        }
      ]
    }
  ) {
    cart {
      items {
        id
        product { name sku }
        quantity
        ... on ConfigurableCartItem {
          configurable_options {
            id
            option_label
            value_label
          }
        }
      }
    }
  }
}
```

## Benefits

✅ **Simpler API** - No need to format and pass configurable options manually  
✅ **Fewer Errors** - Reduces chance of mismatched option IDs and values  
✅ **Less Code** - Removed ~8 lines of option formatting logic  
✅ **Better Performance** - Smaller GraphQL mutation payload  
✅ **Magento Handles It** - Let Magento derive options from child SKU automatically  
✅ **Backward Compatible** - `selectedOptions` parameter still exists but is ignored  

## How It Works

1. **User selects options** on PDP (e.g., Color: Red, Size: 29)
2. **System finds matching variant** using `attribute_code` matching
3. **Extracts child SKU** from the matched variant (e.g., "WSH11-29-Red")
4. **Calls addToGuestCart** with parent SKU ("WSH11") and child SKU ("WSH11-29-Red")
5. **Magento determines options** from the child SKU automatically
6. **Product added to cart** with correct variant and options displayed

## Previous Fix (Included)

This update also includes the previous fix for child SKU matching:
- Added `attribute_code` to GraphQL configurable_options queries
- Fixed variant matching logic to use `attribute_code` instead of `id`
- Properly matches variant attributes with configurable options

## Files Modified

1. **`/workspace/src/services/magentoApi.js`**
   - Simplified `addConfigurableProductToCart()` mutation (lines 469-533)
   - Updated `addToGuestCart()` method (lines 545-560)
   - Removed option formatting logic

2. **`/workspace/src/components/ProductDetailPage.js`** (from previous commit)
   - Fixed variant matching logic (lines 88, 143)
   - Now uses `attribute_code` for matching

## Testing Results

✅ **Build Status**: Successful compilation  
✅ **Bundle Size**: 224 KiB (unchanged)  
✅ **Linter**: No errors  
✅ **Webpack**: No warnings  

## Branch
`cursor/fix-child-sku-processing-fdc4`

## Notes

- The `selectedOptions` parameter in `addToGuestCart()` is kept for backward compatibility but is no longer used
- Magento 2.4.x and later fully support adding configurable products with just parent and child SKU
- The mutation response still includes `configurable_options` showing which options were selected
- This approach is recommended by Magento's GraphQL documentation
