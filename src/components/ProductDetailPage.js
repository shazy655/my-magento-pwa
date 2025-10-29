import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { sku } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);
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
      
      // Fetch product details
      const productData = await magentoApi.fetchProductBySku(sku);
      setProduct(productData);
      
      // Check stock status
      const stockData = await magentoApi.checkStockStatus(sku);
      setStockStatus(stockData);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product || !stockStatus) return;
    
    try {
      setAddingToCart(true);
      setCartMessage('');
      
      const result = await magentoApi.addToGuestCart({
        sku: product.sku,
        qty: quantity
      });
      
      setCartMessage(`Successfully added ${quantity} item(s) to cart!`);
      
      // Clear message after 3 seconds
      setTimeout(() => setCartMessage(''), 3000);
      
    } catch (err) {
      setCartMessage(`Error: ${err.message}`);
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingToCart(false);
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
    
    return 'https://via.placeholder.com/600x600?text=No+Image';
  };

  const getProductPrice = (product) => {
    return product.price ? magentoApi.formatPrice(product.price) : 'Price not available';
  };

  const isInStock = stockStatus && stockStatus.is_in_stock;
  const stockQuantity = stockStatus ? stockStatus.qty : 0;

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
        <div className="no-product">
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
      
      <div className="product-detail-content">
        <div className="product-images">
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="main-product-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x600?text=No+Image';
            }}
          />
        </div>
        
        <div className="product-info">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-sku">SKU: {product.sku}</p>
          <p className="product-price">{getProductPrice(product)}</p>
          
          <div className="stock-info">
            <h3>Stock Information</h3>
            {stockStatus ? (
              <div className="stock-details">
                <div className={`stock-status ${isInStock ? 'in-stock' : 'out-of-stock'}`}>
                  {isInStock ? 'In Stock' : 'Out of Stock'}
                </div>
                <div className="stock-quantity">
                  Available Quantity: {stockQuantity}
                </div>
              </div>
            ) : (
              <div className="stock-loading">Checking stock...</div>
            )}
          </div>
          
          {product.description && (
            <div className="product-description">
              <h3>Description</h3>
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
          
          {isInStock && (
            <div className="add-to-cart-section">
              <div className="quantity-selector">
                <label htmlFor="quantity">Quantity:</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={stockQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(stockQuantity, parseInt(e.target.value) || 1)))}
                  className="quantity-input"
                />
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !isInStock}
                className="add-to-cart-button"
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
              
              {cartMessage && (
                <div className={`cart-message ${cartMessage.includes('Error') ? 'error' : 'success'}`}>
                  {cartMessage}
                </div>
              )}
            </div>
          )}
          
          {!isInStock && (
            <div className="out-of-stock-message">
              <p>This product is currently out of stock.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;