import React, { useState, useEffect } from 'react';
import magentoApi from '../services/magentoApi';
import './CartIndicator.css';

const CartIndicator = () => {
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    updateCartCount();
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      updateCartCount();
    };

    // Add event listener for cart updates
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const updateCartCount = async () => {
    try {
      setLoading(true);
      const count = await magentoApi.getCartItemCount();
      setItemCount(count);
    } catch (error) {
      console.error('Error updating cart count:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-indicator">
      <div className="cart-icon">
        🛒
        {itemCount > 0 && (
          <span className="cart-badge">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>
      {loading && <span className="cart-loading">...</span>}
    </div>
  );
};

export default CartIndicator;