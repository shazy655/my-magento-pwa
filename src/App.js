import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const MAGENTO_BASE_URL = 'http://localhost:8080/magento2/pub';
  const MAGENTO_API_ENDPOINT = `${MAGENTO_BASE_URL}/rest/V1/products`;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch products from Magento 2 REST API
      const response = await fetch(`${MAGENTO_API_ENDPOINT}?searchCriteria[pageSize]=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Magento 2 returns products in data.items array
      if (data.items) {
        setProducts(data.items);
      } else {
        setProducts([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getProductImageUrl = (product) => {
    // Find the base image from custom_attributes
    const imageAttr = product.custom_attributes?.find(
      attr => attr.attribute_code === 'image'
    );
    
    if (imageAttr && imageAttr.value && imageAttr.value !== 'no_selection') {
      return `${MAGENTO_BASE_URL}/media/catalog/product${imageAttr.value}`;
    }
    
    return null;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Magento 2 Products</h1>
        <p>Fetching products from {MAGENTO_BASE_URL}</p>
        <button onClick={fetchProducts} className="refresh-button">
          Refresh Products
        </button>
      </header>

      <main className="App-main">
        {loading && (
          <div className="loading">
            <p>Loading products...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <h2>Error fetching products</h2>
            <p>{error}</p>
            <p>Make sure your Magento 2 instance is running at {MAGENTO_BASE_URL}</p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="no-products">
            <p>No products found</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="products-grid">
            {products.map((product) => {
              const imageUrl = getProductImageUrl(product);
              
              return (
                <div key={product.id} className="product-card">
                  {imageUrl && (
                    <div className="product-image">
                      <img src={imageUrl} alt={product.name} />
                    </div>
                  )}
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-sku">SKU: {product.sku}</p>
                    <p className="product-price">
                      ${product.price?.toFixed(2) || 'N/A'}
                    </p>
                    <p className="product-status">
                      Status: {product.status === 1 ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;