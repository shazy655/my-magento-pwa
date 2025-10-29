import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { sku } = useParams();
  const history = useHistory();
  const [product, setProduct] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [cartId, setCartId] = useState(localStorage.getItem('guestCartId'));

  useEffect(() => {
    if (sku) {
      fetchProductDetails();
    }
  }, [sku]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch product details and stock info in parallel
      const [productData, stockData] = await Promise.all([
        magentoApi.fetchProductBySku(sku),
        magentoApi.checkProductStock(sku).catch(() => null) // Don't fail if stock check fails
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

  const isInStock = () => {
    if (stockInfo) {
      return stockInfo.is_in_stock && stockInfo.qty > 0;
    }
    // Fallback to product status if stock info is not available
    return product && product.status === 1;
  };

  const getStockStatus = () => {
    if (!stockInfo) {
      return product && product.status === 1 ? 'Available' : 'Unavailable';
    }
    
    if (stockInfo.is_in_stock && stockInfo.qty > 0) {
      return `In Stock (${stockInfo.qty} available)`;
    }
    return 'Out of Stock';
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      setQuantity(value);
    }
  };

  const handleAddToCart = async () => {
    if (!isInStock()) {
      setCartMessage('Product is out of stock');
      return;
    }

    try {
      setAddingToCart(true);
      setCartMessage('');

      // Create cart if doesn't exist
      if (!cartId) {
        const newCartId = await magentoApi.createGuestCart();
        setCartId(newCartId);
        localStorage.setItem('guestCartId', newCartId);
      }

      // Add item to cart
      await magentoApi.addToGuestCart(cartId, {
        sku: product.sku,
        qty: quantity
      });

      setCartMessage('Product added to cart successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setCartMessage('');
      }, 3000);

    } catch (err) {
      setCartMessage(`Failed to add to cart: ${err.message}`);
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBackToList = () => {
    history.push('/');
  };

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
          <button onClick={handleBackToList} className="back-button">
            Back to Product List
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
          <button onClick={handleBackToList} className="back-button">
            Back to Product List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button onClick={handleBackToList} className="back-button">
        ← Back to Product List
      </button>

      <div className="product-detail-content">
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
          
          <div className="product-meta">
            <p className="product-sku">SKU: {product.sku}</p>
            <div className={`stock-status ${isInStock() ? 'in-stock' : 'out-of-stock'}`}>
              {getStockStatus()}
            </div>
          </div>

          <div className="product-price">
            {getProductPrice(product)}
          </div>

          {product.description && (
            <div className="product-description">
              <h3>Description</h3>
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}

          {product.short_description && (
            <div className="product-short-description">
              <h3>Short Description</h3>
              <div dangerouslySetInnerHTML={{ __html: product.short_description }} />
            </div>
          )}

          <div className="add-to-cart-section">
            <div className="quantity-selector">
              <label htmlFor="quantity">Quantity:</label>
              <input
                id="quantity"
                type="number"
                min="1"
                max={stockInfo ? stockInfo.qty : 999}
                value={quantity}
                onChange={handleQuantityChange}
                disabled={!isInStock()}
                className="quantity-input"
              />
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!isInStock() || addingToCart}
              className={`add-to-cart-button ${!isInStock() ? 'disabled' : ''}`}
            >
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>

            {cartMessage && (
              <div className={`cart-message ${cartMessage.includes('successfully') ? 'success' : 'error'}`}>
                {cartMessage}
              </div>
            )}
          </div>

          {stockInfo && (
            <div className="stock-details">
              <h3>Stock Information</h3>
              <ul>
                <li>In Stock: {stockInfo.is_in_stock ? 'Yes' : 'No'}</li>
                <li>Quantity Available: {stockInfo.qty}</li>
                <li>Manage Stock: {stockInfo.manage_stock ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;