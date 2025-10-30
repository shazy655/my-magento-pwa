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
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    fetchProductDetails();
  }, [sku]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await magentoApi.getProductDetails(sku);
      setProduct(data);
      
      // If it's a configurable product, fetch variants
      if (data.__typename === 'ConfigurableProduct' || data.configurable_options) {
        const productVariants = await magentoApi.getConfigurableProductVariants(sku);
        setVariants(productVariants);
      }
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
      
      // Check if it's a configurable product and all options are selected
      if (product.__typename === 'ConfigurableProduct') {
        const missingOptions = product.configurable_options?.filter(option => 
          !selectedOptions[option.id]
        );
        
        if (missingOptions && missingOptions.length > 0) {
          setCartMessage({
            type: 'error',
            text: `Please select all options: ${missingOptions.map(opt => opt.label).join(', ')}`
          });
          return;
        }
      }
      
      const productType = product.__typename || 'SimpleProduct';
      let skuToAdd = product.sku;
      let options = [];
      let parentSku = null;
      
      if (productType === 'ConfigurableProduct') {
        // For configurable products, we need both parent and child SKU
        parentSku = product.sku; // The parent configurable product SKU
        
        // Use the selected variant's SKU as the child SKU
        if (selectedVariant && selectedVariant.product) {
          skuToAdd = selectedVariant.product.sku;
        } else {
          // If no variant selected but options are, we need to find the matching variant
          const allOptionsSelected = product.configurable_options?.every(option => 
            selectedOptions[option.id]
          );
          
          if (!allOptionsSelected) {
            throw new Error('Please select all product options');
          }
          
          // Find the variant that matches the selected options
          const matchingVariant = variants.find(v => 
            v.attributes.every(attr => {
              const option = product.configurable_options.find(opt => opt.attribute_code === attr.code);
              return option && selectedOptions[option.id] === attr.value_index;
            })
          );
          
          if (matchingVariant && matchingVariant.product) {
            skuToAdd = matchingVariant.product.sku;
          }
        }
        
        // Build options array with proper format
        options = Object.entries(selectedOptions).map(([optionId, valueIndex]) => ({
          id: parseInt(optionId),
          value_index: parseInt(valueIndex)
        }));
      }
      
      await magentoApi.addToGuestCart(skuToAdd, quantity, productType, options, parentSku);
      
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

  const handleOptionChange = (optionId, valueIndex) => {
    const newSelectedOptions = {
      ...selectedOptions,
      [optionId]: valueIndex
    };
    setSelectedOptions(newSelectedOptions);
    
    // Find the selected variant
    if (product.variants) {
      const variant = product.variants.find(v => 
        v.attributes.every(attr => {
          const option = product.configurable_options.find(opt => opt.attribute_code === attr.code);
          return option && newSelectedOptions[option.id] === attr.value_index;
        })
      );
      setSelectedVariant(variant);
    }
  };

  const isConfigurableProduct = () => {
    return product?.__typename === 'ConfigurableProduct';
  };

  const canAddToCart = () => {
    if (!isInStock()) return false;
    if (!isConfigurableProduct()) return true;
    
    // For configurable products, check if all options are selected
    return product.configurable_options?.every(option => 
      selectedOptions[option.id]
    );
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

  const getCurrentPrice = () => {
    if (selectedVariant && selectedVariant.product) {
      return selectedVariant.product.price_range?.minimum_price;
    }
    return product?.price_range?.minimum_price;
  };

  const getPrice = () => {
    const priceData = getCurrentPrice();
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

          {isConfigurableProduct() && product.configurable_options && (
            <div className="pdp-configurable-options">
              <h3>Product Options</h3>
              {product.configurable_options.map((option) => (
                <div key={option.id} className="configurable-option">
                  <label htmlFor={`option-${option.id}`}>{option.label}:</label>
                  <select
                    id={`option-${option.id}`}
                    value={selectedOptions[option.id] || ''}
                    onChange={(e) => handleOptionChange(option.id, parseInt(e.target.value))}
                    disabled={addingToCart}
                  >
                    <option value="">Please select...</option>
                    {option.values.map((value) => (
                      <option key={value.value_index} value={value.value_index}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
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
                disabled={addingToCart || !canAddToCart()}
                className="add-to-cart-button"
              >
                {addingToCart ? 'Adding...' : 
                 isConfigurableProduct() && !canAddToCart() ? 'Select Options' : 
                 'Add to Cart'}
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
