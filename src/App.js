import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/magento2/pub/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query GetProducts($pageSize: Int!, $currentPage: Int!) {
                products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
                  total_count
                  items {
                    id
                    sku
                    name
                    media_gallery {
                      url
                    }
                    price_range {
                      minimum_price {
                        final_price { value currency }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              pageSize: 12,
              currentPage: 1,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        if (json.errors && json.errors.length) {
          throw new Error(json.errors.map(e => e.message).join('; '));
        }

        const items = json?.data?.products?.items ?? [];
        setProducts(items);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
    return () => controller.abort();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to PWA Studio</h1>
        <p>
          This is a Progressive Web App built with Magento PWA Studio.
        </p>
        <div className="features">
          <h2>Features:</h2>
          <ul>
            <li>Progressive Web App capabilities</li>
            <li>React-based frontend</li>
            <li>Magento integration ready</li>
            <li>Modern development workflow</li>
          </ul>
        </div>

        <section className="products">
          <h2>Products</h2>
          {loading && <p>Loading products…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <div className="product-grid">
              {products.map(product => {
                const imageUrl = product.media_gallery?.[0]?.url;
                const priceValue = product.price_range?.minimum_price?.final_price?.value;
                const priceCurrency = product.price_range?.minimum_price?.final_price?.currency;
                return (
                  <div key={product.id} className="product-card">
                    {imageUrl && (
                      <img src={imageUrl} alt={product.name} className="product-image" />
                    )}
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="product-sku">SKU: {product.sku}</div>
                      {priceValue != null && priceCurrency && (
                        <div className="product-price">
                          {new Intl.NumberFormat(undefined, { style: 'currency', currency: priceCurrency }).format(priceValue)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </header>
    </div>
  );
}

export default App;