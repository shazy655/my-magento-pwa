import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './ProductDetail.css';

const ProductDetail = () => {
  const { sku } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    if (sku) {
      fetchProductDetails();
    }
  }, [sku]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch product details and stock information in parallel
      const [productData, stockData] = await Promise.all([
        magentoApi.fetchProductBySku(sku),
        magentoApi.getStockInfo(sku)
      ]);
      
      setProduct(productData);
      setStockInfo(stockData);
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
      setCartMessage('');
      
      await magentoApi.addToGuestCart(sku, quantity);
      setCartMessage(`Successfully added ${quantity} item(s) to cart!`);
      
      // Trigger cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      // Clear message after 3 seconds
      setTimeout(() => setCartMessage(''), 3000);
    } catch (err) {
      setCartMessage(`Error: ${err.message}`);
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value);
    if (newQuantity > 0 && (!stockInfo || newQuantity <= stockInfo.qty)) {
      setQuantity(newQuantity);
    }
  };

  const getProductImage = (product) => {
    if (product.media_gallery_entries && product.media_gallery_entries.length > 0) {
      const mainImage = product.media_gallery_entries.find(entry => 
        entry.types && entry.types.includes('image')
      ) || product.media_gallery_entries[0];
      
      if (mainImage && mainImage.file) {
        return magentoApi.getImageUrl(mainImage.file);
      }
    }
    
    return 'https://via.placeholder.com/500x500?text=No+Image';
  };

  const getProductPrice = (product) => {
    return product.price ? magentoApi.formatPrice(product.price) : 'Price not available';
  };

  const isInStock = stockInfo && stockInfo.is_in_stock && stockInfo.qty > 0;
  const maxQuantity = stockInfo ? Math.min(stockInfo.qty, 10) : 1; // Limit to 10 or available stock

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-container">
        <div className="error">
          <h3>Error Loading Product</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container">
        <div className="error">
          <h3>Product Not Found</h3>
          <p>The requested product could not be found.</p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate('/')} className="back-button">
        ← Back to Products
      </button>
      
      <div className="product-detail">
        <div className="product-image-section">
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="product-main-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/500x500?text=No+Image';
            }}
          />
        </div>
        
        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-sku">SKU: {product.sku}</p>
          <div className="product-price-large">{getProductPrice(product)}</div>
          
          {/* Stock Information */}
          <div className="stock-info">
            {stockInfo ? (
              <div>
                <div className={`stock-status ${isInStock ? 'in-stock' : 'out-of-stock'}`}>
                  {isInStock ? '✓ In Stock' : '✗ Out of Stock'}
                </div>
                {isInStock && (
                  <p className="stock-quantity">
                    {stockInfo.qty} item(s) available
                  </p>
                )}
              </div>
            ) : (
              <div className="stock-status checking">Checking stock...</div>
            )}
          </div>
          
          {/* Add to Cart Section */}
          {isInStock && (
            <div className="add-to-cart-section">
              <div className="quantity-selector">
                <label htmlFor="quantity">Quantity:</label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="quantity-select"
                >
                  {Array.from({ length: maxQuantity }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !isInStock}
                className="add-to-cart-button"
              >
                {addingToCart ? 'Adding to Cart...' : 'Add to Cart'}
              </button>
              
              {cartMessage && (
                <div className={`cart-message ${cartMessage.startsWith('Error') ? 'error' : 'success'}`}>
                  {cartMessage}
                </div>
              )}
            </div>
          )}
          
          {/* Product Description */}
          {product.custom_attributes && (
            <div className="product-description">
              <h3>Product Details</h3>
              <div className="attributes">
                {product.custom_attributes
                  .filter(attr => attr.attribute_code === 'description' || attr.attribute_code === 'short_description')
                  .map(attr => (
                    <div key={attr.attribute_code} className="attribute">
                      <strong>{attr.attribute_code.replace('_', ' ').toUpperCase()}:</strong>
                      <div dangerouslySetInnerHTML={{ __html: attr.value }} />
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Additional Product Attributes */}
          <div className="product-attributes">
            <h3>Specifications</h3>
            <div className="attributes-grid">
              <div className="attribute-item">
                <span className="attribute-label">Status:</span>
                <span className="attribute-value">
                  {product.status === 1 ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="attribute-item">
                <span className="attribute-label">Visibility:</span>
                <span className="attribute-value">
                  {product.visibility === 4 ? 'Catalog, Search' : 'Limited'}
                </span>
              </div>
              {product.weight && (
                <div className="attribute-item">
                  <span className="attribute-label">Weight:</span>
                  <span className="attribute-value">{product.weight} lbs</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;