import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { sku } = useParams();
  const history = useHistory();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({}); // { [optionId]: value_index }
  const [selectionError, setSelectionError] = useState(null);

  useEffect(() => {
    fetchProductDetails();
  }, [sku]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await magentoApi.getProductDetails(sku);
      setProduct(data);
      setSelectedOptions({});
      setSelectionError(null);
      setCartMessage(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const isConfigurable = useMemo(() => !!product?.configurable_options?.length, [product]);

  const allOptionsSelected = useMemo(() => {
    if (!isConfigurable) return true;
    const requiredCount = product?.configurable_options?.length || 0;
    return Object.keys(selectedOptions).length === requiredCount;
  }, [isConfigurable, product, selectedOptions]);

  const optionIdToCode = useMemo(() => {
    const mapping = {};
    if (product?.configurable_options) {
      product.configurable_options.forEach(opt => {
        mapping[opt.id] = opt.attribute_code;
      });
    }
    return mapping;
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!isConfigurable || !allOptionsSelected || !product?.variants) return null;
    // Build a code -> value_index map from selectedOptions
    const codeToValue = {};
    Object.entries(selectedOptions).forEach(([id, value]) => {
      const code = optionIdToCode[id];
      if (code) codeToValue[code] = Number(value);
    });
    // Find variant whose attributes match all selections
    return (
      product.variants.find(variant => {
        const attrs = variant.attributes || [];
        return Object.entries(codeToValue).every(([code, val]) =>
          attrs.some(a => a.code === code && Number(a.value_index) === Number(val))
        );
      }) || null
    );
  }, [isConfigurable, allOptionsSelected, product, optionIdToCode, selectedOptions]);

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      setCartMessage(null);

      if (isConfigurable) {
        if (!allOptionsSelected) {
          setSelectionError('Please select all options.');
          return;
        }
        if (!selectedVariant?.product?.sku) {
          setSelectionError('Selected variant not available.');
          return;
        }
        if (selectedVariant?.product?.stock_status === 'OUT_OF_STOCK') {
          setSelectionError('Selected variant is out of stock.');
          return;
        }

        // Build configurable_options input
        const configOptions = Object.entries(selectedOptions).map(([id, value]) => ({
          id: Number(id),
          value_id: Number(value),
        }));

        await magentoApi.addConfigurableToGuestCart(
          product.sku,
          selectedVariant.product.sku,
          quantity,
          configOptions
        );
      } else {
        await magentoApi.addToGuestCart(product.sku, quantity);
      }

      setCartMessage({
        type: 'success',
        text: `${product.name} has been added to your cart!`
      });
      
      // Clear message after 5 seconds
      setTimeout(() => setCartMessage(null), 5000);
    } catch (err) {
      setCartMessage({
        type: 'error',
        text: `Failed to add to cart: ${err.message}`
      });
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value > 0) {
      setQuantity(value);
    }
  };

  const getProductImage = () => {
    if (product?.image?.url) {
      return product.image.url;
    }
    if (product?.small_image?.url) {
      return product.small_image.url;
    }
    if (product?.media_gallery && product.media_gallery.length > 0) {
      return product.media_gallery[0].url;
    }
    return '/e-commerce.webp';
  };

  const getPrice = () => {
    const priceData = product?.price_range?.minimum_price;
    if (!priceData) return null;

    const regularPrice = priceData.regular_price;
    const finalPrice = priceData.final_price;
    const currency = regularPrice?.currency || 'USD';

    return {
      regular: regularPrice?.value,
      final: finalPrice?.value,
      currency,
      hasDiscount: regularPrice?.value > finalPrice?.value
    };
  };

  const isInStock = () => {
    return product?.stock_status === 'IN_STOCK';
  };

  const handleOptionChange = (optionId) => (e) => {
    setSelectionError(null);
    const value = e.target.value;
    setSelectedOptions(prev => ({ ...prev, [optionId]: value }));
  };

  if (loading) {
    return (
      <div className="pdp-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdp-container">
        <div className="error">
          <h3>Error Loading Product</h3>
          <p>{error}</p>
          <button onClick={() => history.push('/')} className="back-button">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pdp-container">
        <div className="error">
          <h3>Product Not Found</h3>
          <button onClick={() => history.push('/')} className="back-button">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const price = getPrice();

  return (
    <div className="pdp-container">
      <button onClick={() => history.push('/')} className="back-button">
        ← Back to Products
      </button>

      {cartMessage && (
        <div className={`cart-message ${cartMessage.type}`}>
          {cartMessage.text}
        </div>
      )}

      <div className="pdp-content">
        <div className="pdp-image-section">
          <img
            src={getProductImage()}
            alt={product.name}
            onError={(e) => {
              e.target.src = '/e-commerce.webp';
            }}
          />
        </div>

        <div className="pdp-info-section">
          <h1 className="pdp-title">{product.name}</h1>
          <p className="pdp-sku">SKU: {product.sku}</p>

          {price && (
            <div className="pdp-price">
              {price.hasDiscount && (
                <span className="regular-price">
                  {magentoApi.formatPrice(price.regular, price.currency)}
                </span>
              )}
              <span className="final-price">
                {magentoApi.formatPrice(price.final, price.currency)}
              </span>
              {price.hasDiscount && (
                <span className="discount-badge">
                  Save {magentoApi.formatPrice(price.regular - price.final, price.currency)}
                </span>
              )}
            </div>
          )}

          <div className="pdp-stock">
            {isInStock() ? (
              <span className="stock-status in-stock">
                ✓ In Stock
              </span>
            ) : (
              <span className="stock-status out-of-stock">
                ✗ Out of Stock
              </span>
            )}
          </div>

          {product.short_description?.html && (
            <div 
              className="pdp-short-description"
              dangerouslySetInnerHTML={{ __html: product.short_description.html }}
            />
          )}

          {isInStock() && (
            <div className="pdp-add-to-cart">
              {isConfigurable && product.configurable_options?.length > 0 && (
                <div className="configurable-options">
                  {product.configurable_options.map((opt) => (
                    <div className="configurable-option" key={opt.id}>
                      <label htmlFor={`opt-${opt.id}`}>{opt.label}:</label>
                      <select
                        id={`opt-${opt.id}`}
                        value={selectedOptions[opt.id] ?? ''}
                        onChange={handleOptionChange(opt.id)}
                        disabled={addingToCart}
                      >
                        <option value="" disabled>Select {opt.label}</option>
                        {opt.values.map(v => (
                          <option key={v.value_index} value={v.value_index}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {selectionError && <div className="option-error">{selectionError}</div>}
                </div>
              )}
              <div className="quantity-selector">
                <label htmlFor="quantity">Quantity:</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={addingToCart}
                />
              </div>

              <button
                onClick={handleAddToCart}
                disabled={addingToCart || (isConfigurable && !allOptionsSelected)}
                className="add-to-cart-button"
              >
                {addingToCart ? 'Adding...' : (isConfigurable && !allOptionsSelected ? 'Select Options' : 'Add to Cart')}
              </button>
            </div>
          )}

          {!isInStock() && (
            <div className="out-of-stock-message">
              <p>This product is currently out of stock.</p>
            </div>
          )}
        </div>
      </div>

      {product.description?.html && (
        <div className="pdp-description">
          <h2>Product Description</h2>
          <div dangerouslySetInnerHTML={{ __html: product.description.html }} />
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
