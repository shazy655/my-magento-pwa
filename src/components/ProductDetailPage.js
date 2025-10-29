import React, { useState, useEffect } from 'react';
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
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    fetchProductDetails();
  }, [sku]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await magentoApi.getProductDetails(sku);
      setProduct(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      setCartMessage(null);
      
      // Configurable products require a selected variant
      if (product?.configurable_options?.length) {
        // Ensure all options are selected
        const allSelected = product.configurable_options.every((opt) => selectedOptions[opt.id] != null);
        if (!allSelected) {
          throw new Error('Please select all options before adding to cart.');
        }

        const variant = findMatchingVariant(product, selectedOptions);
        if (!variant?.product?.sku) {
          throw new Error('Selected combination is unavailable. Please try a different selection.');
        }

        await magentoApi.addConfigurableToGuestCart(product.sku, variant.product.sku, quantity);
      } else {
        // Simple product
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
    if (selectedVariant?.product?.small_image?.url) {
      return selectedVariant.product.small_image.url;
    }
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
    // Prefer selected variant price if available (configurable)
    const variantPriceData = selectedVariant?.product?.price_range?.minimum_price;
    const priceData = variantPriceData || product?.price_range?.minimum_price;
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
    if (selectedVariant?.product?.stock_status) {
      return selectedVariant.product.stock_status === 'IN_STOCK';
    }
    return product?.stock_status === 'IN_STOCK';
  };

  const handleOptionChange = (optionId, valueIndex) => {
    setSelectedOptions((prev) => ({ ...prev, [optionId]: valueIndex }));
  };

  const findMatchingVariant = (prod, selections) => {
    const options = prod?.configurable_options || [];
    const variants = prod?.variants || [];
    if (!options.length || !variants.length) return null;

    // Map selections by attribute_code for easier matching
    const selectedByCode = {};
    for (const opt of options) {
      if (opt.attribute_code && selections[opt.id] != null) {
        selectedByCode[opt.attribute_code] = selections[opt.id];
      }
    }

    const requiredCodes = options.map((o) => o.attribute_code).filter(Boolean);
    // Only attempt match when all required attributes are selected
    const allSelected = requiredCodes.every((code) => selectedByCode[code] != null);
    if (!allSelected) return null;

    return variants.find((variant) =>
      requiredCodes.every((code) => {
        const attr = variant.attributes.find((a) => a.code === code);
        return attr && attr.value_index === selectedByCode[code];
      })
    );
  };

  useEffect(() => {
    if (product?.configurable_options?.length) {
      const variant = findMatchingVariant(product, selectedOptions);
      setSelectedVariant(variant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [product, selectedOptions]);

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

          {/* Configurable options UI */}
          {product?.configurable_options?.length > 0 && (
            <div className="pdp-configurator">
              {product.configurable_options.map((opt) => (
                <div className="config-option" key={opt.id}>
                  <label htmlFor={`opt-${opt.id}`}>{opt.label}</label>
                  <select
                    id={`opt-${opt.id}`}
                    value={selectedOptions[opt.id] ?? ''}
                    onChange={(e) => handleOptionChange(opt.id, Number(e.target.value))}
                    disabled={addingToCart}
                  >
                    <option value="">Select {opt.label}</option>
                    {opt.values.map((v) => (
                      <option key={v.value_index} value={v.value_index}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {product.configurable_options.length > 0 && !selectedVariant && (
                <div className="config-hint">Please select all options to see availability and price.</div>
              )}
            </div>
          )}

          {isInStock() && (
            <div className="pdp-add-to-cart">
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
                disabled={addingToCart || (product?.configurable_options?.length > 0 && !selectedVariant)}
                className="add-to-cart-button"
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
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
