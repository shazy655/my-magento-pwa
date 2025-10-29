import React from 'react';
import { useCart } from '../contexts/CartContext';
import './CartInfo.css';

const CartInfo = () => {
  const {
    cartId,
    cartItems,
    isLoading,
    error,
    createEmptyCart,
    getCartItemCount,
    getCartTotal,
  } = useCart();

  const handleCreateEmptyCart = async () => {
    try {
      await createEmptyCart();
      alert('Empty cart created successfully!');
    } catch (error) {
      alert(`Error creating empty cart: ${error.message}`);
    }
  };

  return (
    <div className="cart-info">
      <h3>Cart Information</h3>
      
      {error && (
        <div className="cart-error">
          <p>Error: {error}</p>
        </div>
      )}
      
      {isLoading && (
        <div className="cart-loading">
          <p>Loading cart...</p>
        </div>
      )}
      
      <div className="cart-details">
        <p><strong>Cart ID:</strong> {cartId || 'No cart created'}</p>
        <p><strong>Items in cart:</strong> {getCartItemCount()}</p>
        <p><strong>Total:</strong> ${getCartTotal().toFixed(2)}</p>
      </div>
      
      <div className="cart-actions">
        <button 
          onClick={handleCreateEmptyCart}
          disabled={isLoading}
          className="create-cart-btn"
        >
          {isLoading ? 'Creating...' : 'Create Empty Cart'}
        </button>
      </div>
      
      {cartItems.length > 0 && (
        <div className="cart-items">
          <h4>Cart Items:</h4>
          <ul>
            {cartItems.map((item, index) => (
              <li key={index}>
                {item.name || item.sku} - Qty: {item.qty} - ${(item.price || 0).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CartInfo;