/**
 * Test script to demonstrate the createEmptyCart GraphQL mutation
 * This script shows how to use the mutation and what it returns
 */

// Example usage of the createEmptyCart mutation
const testCreateEmptyCart = async () => {
  try {
    // Import the Magento API service
    const magentoApi = require('./src/services/magentoApi.js').default;
    
    console.log('Testing createEmptyCart GraphQL mutation...');
    
    // Call the createEmptyCart mutation
    const cartId = await magentoApi.createEmptyCart();
    
    console.log('✅ Success! Empty cart created with ID:', cartId);
    console.log('Cart ID type:', typeof cartId);
    console.log('Cart ID length:', cartId.length);
    
    // Verify the cart ID is stored in localStorage
    const storedCartId = localStorage.getItem('guest_cart_id');
    console.log('Stored in localStorage:', storedCartId);
    console.log('IDs match:', cartId === storedCartId);
    
    return cartId;
  } catch (error) {
    console.error('❌ Error creating empty cart:', error.message);
    throw error;
  }
};

// Example GraphQL mutation that would be sent to Magento
const exampleMutation = `
mutation {
  createEmptyCart
}`;

console.log('GraphQL Mutation:');
console.log(exampleMutation);
console.log('\nExpected Response:');
console.log('{');
console.log('  "data": {');
console.log('    "createEmptyCart": "cart_id_string_here"');
console.log('  }');
console.log('}');

// Note: This test would need to be run in a browser environment
// where localStorage and fetch are available
console.log('\nNote: This test requires a browser environment with Magento 2 running on localhost:8080');