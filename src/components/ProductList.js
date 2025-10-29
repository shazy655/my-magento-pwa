import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './ProductList.css';

const ProductList = () => {
  const history = useHistory();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(12);

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await magentoApi.fetchProducts({
        pageSize,
        currentPage
      });
      
      setProducts(response.items);
      setTotalCount(response.totalCount);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchProducts();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getProductImage = (product) => {
    // Try to get the first media gallery entry or use a placeholder
    if (product.media_gallery_entries && product.media_gallery_entries.length > 0) {
      const mainImage = product.media_gallery_entries.find(entry => 
        entry.types && entry.types.includes('image')
      ) || product.media_gallery_entries[0];
      
      if (mainImage && mainImage.file) {
        return magentoApi.getImageUrl(mainImage.file);
      }
      return  false;
    }
    
    // Fallback to placeholder image
    return 'http://localhost:3000/e-commerce.webp';
  };

  const getProductPrice = (product) => {
    return product.price ? magentoApi.formatPrice(product.price) : 'Price not available';
  };

  const handleProductClick = (sku) => {
    history.push(`/product/${sku}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="product-list-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading products from Magento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-list-container">
        <div className="error">
          <h3>Error Loading Products</h3>
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="product-list-container">
        <div className="no-products">
          <h3>No Products Found</h3>
          <p>No products are currently available in the catalog.</p>
          <button onClick={handleRetry} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <h2>Products from Magento 2</h2>
        <p className="product-count">
          Showing {products.length} of {totalCount} products
        </p>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="product-card"
            onClick={() => handleProductClick(product.sku)}
          >
            <div className="product-image">
              <img
                src={getProductImage(product)}
                alt={product.name}
                onError={(e) => {
                  e.target.src = 'e-commerce.webp';
                }}
              />
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-sku">SKU: {product.sku}</p>
              <p className="product-price">{getProductPrice(product)}</p>
              <div className="product-type">
                {product.productType === 'ConfigurableProduct' ? (
                  <span className="product-type-badge configurable">Configurable</span>
                ) : (
                  <span className="product-type-badge simple">Simple</span>
                )}
              </div>
              {product.status === 1 && (
                <span className="product-status available">Available</span>
              )}
              {product.status !== 1 && (
                <span className="product-status unavailable">Unavailable</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;