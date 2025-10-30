import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './Cart.css';

const Cart = () => {
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCartData();
  }, []);

  const loadCartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await magentoApi.getCartData();
      setCartData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    magentoApi.clearCartCache();
    loadCartData();
  };

  if (loading) {
    return (
      <div className="cart-container">
        <div className="cart-loading">Loading cart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-container">
        <div className="cart-error">
          <p>Error loading cart: {error}</p>
          <button onClick={handleRefresh} className="btn-refresh">Retry</button>
        </div>
      </div>
    );
  }

  const items = cartData?.items || [];
  const grandTotal = cartData?.prices?.grand_total || { value: 0, currency: 'USD' };
  const isEmpty = items.length === 0;

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <button onClick={handleRefresh} className="btn-refresh" title="Refresh cart">
          🔄 Refresh
        </button>
      </div>

      {isEmpty ? (
        <div className="cart-empty">
          <p>Your cart is empty</p>
          <Link to="/" className="btn-continue-shopping">Continue Shopping</Link>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item) => {
              const product = item.product;
              const price = product?.price_range?.minimum_price?.regular_price || { value: 0, currency: 'USD' };
              const imageUrl = product?.small_image?.url || null;
              const itemTotal = price.value * item.quantity;

              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} />
                    ) : (
                      <div className="cart-item-no-image">No Image</div>
                    )}
                  </div>
                  <div className="cart-item-details">
                    <h3>{product.name}</h3>
                    <p className="cart-item-sku">SKU: {product.sku}</p>
                    <p className="cart-item-price">
                      {magentoApi.formatPrice(price.value, price.currency)}
                    </p>
                  </div>
                  <div className="cart-item-quantity">
                    <label>Qty:</label>
                    <span className="quantity-value">{item.quantity}</span>
                  </div>
                  <div className="cart-item-total">
                    {magentoApi.formatPrice(itemTotal, price.currency)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span className="cart-summary-label">Items:</span>
              <span className="cart-summary-value">{items.length}</span>
            </div>
            <div className="cart-summary-row">
              <span className="cart-summary-label">Total Quantity:</span>
              <span className="cart-summary-value">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="cart-summary-row cart-summary-total">
              <span className="cart-summary-label">Grand Total:</span>
              <span className="cart-summary-value">
                {magentoApi.formatPrice(grandTotal.value, grandTotal.currency)}
              </span>
            </div>
          </div>

          <div className="cart-actions">
            <Link to="/" className="btn-continue-shopping">Continue Shopping</Link>
            <Link to="/checkout" className="btn-checkout">Proceed to Checkout</Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
