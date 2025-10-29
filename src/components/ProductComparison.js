import React, { useState, useEffect } from 'react';
import magentoApi from '../services/magentoApi';
import graphqlApi from '../services/graphqlApi';
import './ProductList.css';

const ProductComparison = () => {
  const [restProducts, setRestProducts] = useState([]);
  const [graphqlProducts, setGraphqlProducts] = useState([]);
  const [restLoading, setRestLoading] = useState(true);
  const [graphqlLoading, setGraphqlLoading] = useState(true);
  const [restError, setRestError] = useState(null);
  const [graphqlError, setGraphqlError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6);

  useEffect(() => {
    fetchBothApis();
  }, [currentPage]);

  const fetchBothApis = async () => {
    // Fetch from REST API
    try {
      setRestLoading(true);
      setRestError(null);
      
      const restResponse = await magentoApi.fetchProducts({
        pageSize,
        currentPage
      });
      
      setRestProducts(restResponse.items);
    } catch (err) {
      setRestError(err.message);
      console.error('Failed to fetch products via REST:', err);
    } finally {
      setRestLoading(false);
    }

    // Fetch from GraphQL API
    try {
      setGraphqlLoading(true);
      setGraphqlError(null);
      
      const graphqlResponse = await graphqlApi.fetchProducts({
        pageSize,
        currentPage
      });
      
      setGraphqlProducts(graphqlResponse.items);
    } catch (err) {
      setGraphqlError(err.message);
      console.error('Failed to fetch products via GraphQL:', err);
    } finally {
      setGraphqlLoading(false);
    }
  };

  const handleRetry = () => {
    fetchBothApis();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getProductImage = (product, isGraphql = false) => {
    if (isGraphql) {
      return graphqlApi.getProductImage(product);
    }
    
    // REST API image handling
    if (product.media_gallery_entries && product.media_gallery_entries.length > 0) {
      const mainImage = product.media_gallery_entries.find(entry => 
        entry.types && entry.types.includes('image')
      ) || product.media_gallery_entries[0];
      
      if (mainImage && mainImage.file) {
        return magentoApi.getImageUrl(mainImage.file);
      }
    }
    
    return 'https://via.placeholder.com/300x300?text=No+Image';
  };

  const getProductPrice = (product, isGraphql = false) => {
    if (isGraphql) {
      return graphqlApi.formatPrice(product.price_range);
    }
    
    return product.price ? magentoApi.formatPrice(product.price) : 'Price not available';
  };

  const renderProductCard = (product, isGraphql = false) => (
    <div key={`${isGraphql ? 'gql' : 'rest'}-${product.id}`} className="product-card">
      <div className="product-image">
        <img
          src={getProductImage(product, isGraphql)}
          alt={product.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
          }}
        />
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-sku">SKU: {product.sku}</p>
        <p className="product-price">{getProductPrice(product, isGraphql)}</p>
        {isGraphql ? (
          product.status === '1' ? (
            <span className="product-status available">Available</span>
          ) : (
            <span className="product-status unavailable">Unavailable</span>
          )
        ) : (
          product.status === 1 ? (
            <span className="product-status available">Available</span>
          ) : (
            <span className="product-status unavailable">Unavailable</span>
          )
        )}
      </div>
    </div>
  );

  const renderApiSection = (title, products, loading, error, isGraphql = false) => {
    if (loading) {
      return (
        <div className="api-section">
          <h3>{title}</h3>
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading products via {isGraphql ? 'GraphQL' : 'REST API'}...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="api-section">
          <h3>{title}</h3>
          <div className="error">
            <h4>Error Loading Products</h4>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="api-section">
        <h3>{title}</h3>
        <p className="product-count">
          Showing {products.length} products
        </p>
        <div className="product-grid">
          {products.map(product => renderProductCard(product, isGraphql))}
        </div>
      </div>
    );
  };

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <h2>API Comparison: REST vs GraphQL</h2>
        <p className="product-count">
          Page {currentPage} - {pageSize} products per API
        </p>
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      </div>

      <div className="comparison-container">
        {renderApiSection(
          'REST API',
          restProducts,
          restLoading,
          restError,
          false
        )}
        
        {renderApiSection(
          'GraphQL API',
          graphqlProducts,
          graphqlLoading,
          graphqlError,
          true
        )}
      </div>
    </div>
  );
};

export default ProductComparison;