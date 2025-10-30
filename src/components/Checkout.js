import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './Checkout.css';

const Checkout = () => {
  const history = useHistory();
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    firstname: '',
    lastname: '',
    street: [''],
    city: '',
    region_id: 43, // Default to New York
    postcode: '',
    country_code: 'US',
    telephone: '',
  });

  const [billingAddress, setBillingAddress] = useState({
    firstname: '',
    lastname: '',
    street: [''],
    city: '',
    region_id: 43,
    postcode: '',
    country_code: 'US',
    telephone: '',
  });

  useEffect(() => {
    loadCartData();
  }, []);

  const loadCartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await magentoApi.getCartData();
      
      if (!data || !data.items || data.items.length === 0) {
        setError('Your cart is empty. Please add items before checkout.');
        setTimeout(() => history.push('/cart'), 2000);
        return;
      }
      
      setCartData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShippingChange = (field, value) => {
    if (field === 'street') {
      setShippingAddress({ ...shippingAddress, street: [value] });
    } else {
      setShippingAddress({ ...shippingAddress, [field]: value });
    }
  };

  const handleBillingChange = (field, value) => {
    if (field === 'street') {
      setBillingAddress({ ...billingAddress, street: [value] });
    } else {
      setBillingAddress({ ...billingAddress, [field]: value });
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateAddress = (address) => {
    return (
      address.firstname &&
      address.lastname &&
      address.street[0] &&
      address.city &&
      address.postcode &&
      address.telephone
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validateAddress(shippingAddress)) {
      setError('Please fill in all shipping address fields');
      return;
    }

    if (!sameAsShipping && !validateAddress(billingAddress)) {
      setError('Please fill in all billing address fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const cartId = localStorage.getItem('guest_cart_id');
      if (!cartId) {
        throw new Error('Cart ID not found');
      }

      // Step 1: Set guest email
      await magentoApi.setGuestEmailOnCart(cartId, email);
      console.log('Email set successfully');

      // Step 2: Set shipping address
      await magentoApi.setShippingAddressOnCart(cartId, shippingAddress);
      console.log('Shipping address set successfully');

      // Step 3: Set billing address
      const finalBillingAddress = sameAsShipping ? shippingAddress : billingAddress;
      await magentoApi.setBillingAddressOnCart(cartId, finalBillingAddress, sameAsShipping);
      console.log('Billing address set successfully');

      setSuccess(true);
      setError(null);
      
      // Redirect to success page or next step after 2 seconds
      setTimeout(() => {
        alert('Checkout information saved! In a real application, this would proceed to payment.');
        history.push('/cart');
      }, 2000);

    } catch (err) {
      setError(err.message);
      console.error('Error during checkout:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-container">
        <div className="checkout-loading">Loading checkout...</div>
      </div>
    );
  }

  if (error && !cartData) {
    return (
      <div className="checkout-container">
        <div className="checkout-error">
          <p>{error}</p>
          <button onClick={() => history.push('/cart')} className="btn-back">
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  const items = cartData?.items || [];
  const grandTotal = cartData?.prices?.grand_total || { value: 0, currency: 'USD' };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>

      {success && (
        <div className="checkout-success">
          ✓ Checkout information saved successfully!
        </div>
      )}

      {error && (
        <div className="checkout-error">
          {error}
        </div>
      )}

      <div className="checkout-content">
        <div className="checkout-form">
          <form onSubmit={handleSubmit}>
            {/* Email Section */}
            <section className="checkout-section">
              <h2>Contact Information</h2>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="guest@example.com"
                  disabled={submitting}
                />
              </div>
            </section>

            {/* Shipping Address Section */}
            <section className="checkout-section">
              <h2>Shipping Address</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shipping-firstname">First Name *</label>
                  <input
                    type="text"
                    id="shipping-firstname"
                    value={shippingAddress.firstname}
                    onChange={(e) => handleShippingChange('firstname', e.target.value)}
                    required
                    placeholder="John"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="shipping-lastname">Last Name *</label>
                  <input
                    type="text"
                    id="shipping-lastname"
                    value={shippingAddress.lastname}
                    onChange={(e) => handleShippingChange('lastname', e.target.value)}
                    required
                    placeholder="Doe"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="shipping-street">Street Address *</label>
                <input
                  type="text"
                  id="shipping-street"
                  value={shippingAddress.street[0]}
                  onChange={(e) => handleShippingChange('street', e.target.value)}
                  required
                  placeholder="123 Main Street"
                  disabled={submitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shipping-city">City *</label>
                  <input
                    type="text"
                    id="shipping-city"
                    value={shippingAddress.city}
                    onChange={(e) => handleShippingChange('city', e.target.value)}
                    required
                    placeholder="New York"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="shipping-region">State *</label>
                  <input
                    type="number"
                    id="shipping-region"
                    value={shippingAddress.region_id}
                    onChange={(e) => handleShippingChange('region_id', parseInt(e.target.value))}
                    required
                    placeholder="43"
                    disabled={submitting}
                  />
                  <small>Region ID (e.g., 43 for New York)</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shipping-postcode">ZIP Code *</label>
                  <input
                    type="text"
                    id="shipping-postcode"
                    value={shippingAddress.postcode}
                    onChange={(e) => handleShippingChange('postcode', e.target.value)}
                    required
                    placeholder="10001"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="shipping-country">Country *</label>
                  <select
                    id="shipping-country"
                    value={shippingAddress.country_code}
                    onChange={(e) => handleShippingChange('country_code', e.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="US">United States</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="shipping-telephone">Phone Number *</label>
                <input
                  type="tel"
                  id="shipping-telephone"
                  value={shippingAddress.telephone}
                  onChange={(e) => handleShippingChange('telephone', e.target.value)}
                  required
                  placeholder="1234567890"
                  disabled={submitting}
                />
              </div>
            </section>

            {/* Billing Address Section */}
            <section className="checkout-section">
              <h2>Billing Address</h2>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(e) => setSameAsShipping(e.target.checked)}
                    disabled={submitting}
                  />
                  <span>Same as shipping address</span>
                </label>
              </div>

              {!sameAsShipping && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="billing-firstname">First Name *</label>
                      <input
                        type="text"
                        id="billing-firstname"
                        value={billingAddress.firstname}
                        onChange={(e) => handleBillingChange('firstname', e.target.value)}
                        required
                        placeholder="John"
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="billing-lastname">Last Name *</label>
                      <input
                        type="text"
                        id="billing-lastname"
                        value={billingAddress.lastname}
                        onChange={(e) => handleBillingChange('lastname', e.target.value)}
                        required
                        placeholder="Doe"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="billing-street">Street Address *</label>
                    <input
                      type="text"
                      id="billing-street"
                      value={billingAddress.street[0]}
                      onChange={(e) => handleBillingChange('street', e.target.value)}
                      required
                      placeholder="123 Main Street"
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="billing-city">City *</label>
                      <input
                        type="text"
                        id="billing-city"
                        value={billingAddress.city}
                        onChange={(e) => handleBillingChange('city', e.target.value)}
                        required
                        placeholder="New York"
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="billing-region">State *</label>
                      <input
                        type="number"
                        id="billing-region"
                        value={billingAddress.region_id}
                        onChange={(e) => handleBillingChange('region_id', parseInt(e.target.value))}
                        required
                        placeholder="43"
                        disabled={submitting}
                      />
                      <small>Region ID (e.g., 43 for New York)</small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="billing-postcode">ZIP Code *</label>
                      <input
                        type="text"
                        id="billing-postcode"
                        value={billingAddress.postcode}
                        onChange={(e) => handleBillingChange('postcode', e.target.value)}
                        required
                        placeholder="10001"
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="billing-country">Country *</label>
                      <select
                        id="billing-country"
                        value={billingAddress.country_code}
                        onChange={(e) => handleBillingChange('country_code', e.target.value)}
                        required
                        disabled={submitting}
                      >
                        <option value="US">United States</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="billing-telephone">Phone Number *</label>
                    <input
                      type="tel"
                      id="billing-telephone"
                      value={billingAddress.telephone}
                      onChange={(e) => handleBillingChange('telephone', e.target.value)}
                      required
                      placeholder="1234567890"
                      disabled={submitting}
                    />
                  </div>
                </>
              )}
            </section>

            {/* Submit Button */}
            <div className="checkout-actions">
              <button
                type="button"
                onClick={() => history.push('/cart')}
                className="btn-back"
                disabled={submitting}
              >
                Back to Cart
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="checkout-summary">
          <h2>Order Summary</h2>
          <div className="summary-items">
            {items.map((item) => {
              const product = item.product;
              const price = product?.price_range?.minimum_price?.regular_price || { value: 0, currency: 'USD' };
              const itemTotal = price.value * item.quantity;

              return (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-details">
                    <h4>{product.name}</h4>
                    <p>Qty: {item.quantity}</p>
                  </div>
                  <div className="summary-item-price">
                    {magentoApi.formatPrice(itemTotal, price.currency)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="summary-total">
            <span>Grand Total:</span>
            <span className="total-amount">
              {magentoApi.formatPrice(grandTotal.value, grandTotal.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
