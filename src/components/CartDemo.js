import React, { useState } from 'react';
import magentoApi from '../services/magentoApi';
import './CartDemo.css';

const CartDemo = () => {
  const [cartId, setCartId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const createEmptyCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newCartId = await magentoApi.createEmptyCart();
      setCartId(newCartId);
      
      console.log('Created empty cart with ID:', newCartId);
    } catch (err) {
      setError(err.message);
      console.error('Error creating empty cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCartItems = async () => {
    if (!cartId) {
      setError('No cart ID available. Create a cart first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const items = await magentoApi.getGuestCartItemsGraphQL();
      setCartItems(items);
      
      console.log('Cart items:', items);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching cart items:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    localStorage.removeItem('guest_cart_id');
    setCartId(null);
    setCartItems([]);
    setError(null);
  };

  return (
    <div className="cart-demo">
      <h2>GraphQL createEmptyCart Demo</h2>
      
      <div className="demo-section">
        <h3>Cart Management</h3>
        <div className="button-group">
          <button 
            onClick={createEmptyCart} 
            disabled={loading}
            className="demo-button primary"
          >
            {loading ? 'Creating...' : 'Create Empty Cart'}
          </button>
          
          <button 
            onClick={getCartItems} 
            disabled={loading || !cartId}
            className="demo-button secondary"
          >
            {loading ? 'Loading...' : 'Get Cart Items'}
          </button>
          
          <button 
            onClick={clearCart} 
            disabled={loading}
            className="demo-button danger"
          >
            Clear Cart
          </button>
        </div>
      </div>

      {cartId && (
        <div className="cart-info">
          <h4>Current Cart ID:</h4>
          <code className="cart-id">{cartId}</code>
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="cart-items">
          <h4>Cart Items ({cartItems.length}):</h4>
          <ul>
            {cartItems.map((item, index) => (
              <li key={item.id || index} className="cart-item">
                <strong>{item.product?.name || 'Unknown Product'}</strong>
                <span>SKU: {item.product?.sku}</span>
                <span>Quantity: {item.quantity}</span>
                {item.prices?.row_total && (
                  <span>Total: {magentoApi.formatPrice(item.prices.row_total.value, item.prices.row_total.currency)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="demo-info">
        <h4>GraphQL Mutation Used:</h4>
        <pre className="code-block">
{`mutation {
  createEmptyCart
}`}
        </pre>
        
        <p>This mutation creates an empty cart and returns the cart ID, which is then stored in localStorage for future operations.</p>
      </div>
    </div>
  );
};

export default CartDemo;