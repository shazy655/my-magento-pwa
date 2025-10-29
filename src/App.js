import React, { useState } from 'react';
import './App.css';
import { getProductBySku, searchProducts } from './api/magento';

function App() {
  const [sku, setSku] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);

  const handleFetchBySku = async (e) => {
    e.preventDefault();
    setError(null);
    setItems([]);
    setProduct(null);
    if (!sku.trim()) return;
    setLoading(true);
    try {
      const result = await getProductBySku(sku.trim());
      setProduct(result);
    } catch (err) {
      setError(err?.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setItems([]);
    setProduct(null);
    setLoading(true);
    try {
      const { items: results } = await searchProducts(search || undefined);
      setItems(results);
    } catch (err) {
      setError(err?.message || 'Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Magento 2 Product Fetch</h1>
        <p>Target: <code>/magento2/pub</code> via dev proxy</p>

        <form onSubmit={handleFetchBySku} style={{ marginBottom: 16 }}>
          <label>
            SKU:&nbsp;
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. 24-MB01"
            />
          </label>
          <button type="submit" disabled={loading || !sku.trim()} style={{ marginLeft: 8 }}>
            Fetch by SKU
          </button>
        </form>

        <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
          <label>
            Search:&nbsp;
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. bag"
            />
          </label>
          <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
            Search Products
          </button>
        </form>

        {loading && <p>Loading…</p>}
        {error && <p style={{ color: 'salmon' }}>{error}</p>}

        {product && (
          <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, maxWidth: 600 }}>
            <h2>{product.name} <small style={{ fontWeight: 'normal' }}>({product.sku})</small></h2>
            {product.small_image?.url && (
              <img src={product.small_image.url} alt={product.name} style={{ maxWidth: 200 }} />
            )}
            <p>
              Price: {product.price_range?.minimum_price?.regular_price?.value}
              &nbsp;{product.price_range?.minimum_price?.regular_price?.currency}
            </p>
            {product.description?.html && (
              <div dangerouslySetInnerHTML={{ __html: product.description.html }} />
            )}
          </div>
        )}

        {!product && items?.length > 0 && (
          <div style={{ maxWidth: 800, textAlign: 'left' }}>
            <h2>Results ({items.length})</h2>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {items.map((it) => (
                <li key={it.sku} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #333' }}>
                  {it.small_image?.url && (
                    <img src={it.small_image.url} alt={it.name} style={{ width: 50, height: 50, objectFit: 'contain' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div style={{ opacity: 0.8 }}>SKU: {it.sku}</div>
                  </div>
                  <div>
                    {it.price_range?.minimum_price?.regular_price?.value}
                    &nbsp;{it.price_range?.minimum_price?.regular_price?.currency}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;