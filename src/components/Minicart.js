import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './Minicart.css';

const Minicart = () => {
  const [cartData, setCartData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCartData();
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCartData();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const loadCartData = async () => {
    try {
      setLoading(true);
      const data = await magentoApi.getCartData();
      setCartData(data);
    } catch (err) {
      console.error('Error loading cart in minicart:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMinicart = () => {
    setIsOpen(!isOpen);
  };

  const closeMinicart = () => {
    setIsOpen(false);
  };

  const items = cartData?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = cartData?.prices?.grand_total || { value: 0, currency: 'USD' };

  return (
    <div className="minicart">
      <button 
        className="minicart-trigger" 
        onClick={toggleMinicart}
        aria-label="Shopping cart"
      >
        🛒 Cart
        {itemCount > 0 && (
          <span className="minicart-badge">{itemCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="minicart-overlay" onClick={closeMinicart}></div>
          <div className="minicart-dropdown">
            <div className="minicart-header">
              <h3>Shopping Cart</h3>
              <button 
                className="minicart-close" 
                onClick={closeMinicart}
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            <div className="minicart-content">
              {loading ? (
                <div className="minicart-loading">Loading...</div>
              ) : items.length === 0 ? (
                <div className="minicart-empty">
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="minicart-items">
                    {items.map((item) => {
                      const product = item.product;
                      const price = product?.price_range?.minimum_price?.regular_price || { value: 0, currency: 'USD' };
                      const imageUrl = product?.small_image?.url || null;

                      return (
                        <div key={item.id} className="minicart-item">
                          <div className="minicart-item-image">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.name} />
                            ) : (
                              <div className="minicart-item-no-image">?</div>
                            )}
                          </div>
                          <div className="minicart-item-details">
                            <p className="minicart-item-name">{product.name}</p>
                            <p className="minicart-item-price">
                              {item.quantity} × {magentoApi.formatPrice(price.value, price.currency)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="minicart-footer">
                    <div className="minicart-subtotal">
                      <span>Subtotal:</span>
                      <span className="minicart-subtotal-amount">
                        {magentoApi.formatPrice(grandTotal.value, grandTotal.currency)}
                      </span>
                    </div>
                    <Link 
                      to="/cart" 
                      className="minicart-view-cart"
                      onClick={closeMinicart}
                    >
                      View Cart
                    </Link>
                    <button className="minicart-checkout">
                      Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Minicart;
