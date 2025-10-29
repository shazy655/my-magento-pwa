import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import magentoApi from '../services/magentoApi';

const ProductDetails = () => {
  const { sku } = useParams();
  const [product, setProduct] = useState(null);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setMessage(null);
        const [p, s] = await Promise.all([
          magentoApi.fetchProductBySku(sku),
          magentoApi.fetchStockBySku(sku).catch(() => null),
        ]);
        if (!mounted) return;
        setProduct(p);
        setStock(s);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [sku]);

  const imageUrl = useMemo(() => {
    if (!product) return null;
    const entries = product.media_gallery_entries || [];
    const main = entries.find(e => Array.isArray(e.types) && e.types.includes('image')) || entries[0];
    const file = main && main.file ? main.file : null;
    return file ? magentoApi.getImageUrl(file) : 'https://via.placeholder.com/600x600?text=No+Image';
  }, [product]);

  const formattedPrice = useMemo(() => {
    if (!product || typeof product.price !== 'number') return 'Price not available';
    return magentoApi.formatPrice(product.price);
  }, [product]);

  const inStock = !!(stock && (stock.is_in_stock === true || (typeof stock.qty === 'number' && stock.qty > 0)));

  const handleAddToCart = async () => {
    try {
      setAdding(true);
      setMessage(null);
      const numQty = Math.max(1, Number(qty) || 1);
      const cartId = await magentoApi.getOrCreateGuestCartId();
      await magentoApi.addItemToGuestCart(cartId, sku, numQty);
      setMessage('Added to cart successfully.');
    } catch (err) {
      setMessage(err.message || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="product-details-container">
        <p>Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-details-container">
        <p style={{ color: 'red' }}>{error}</p>
        <p><Link to="/">Back to products</Link></p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-container">
        <p>Product not found.</p>
        <p><Link to="/">Back to products</Link></p>
      </div>
    );
  }

  return (
    <div className="product-details-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <p><Link to="/">← Back to products</Link></p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/600x600?text=No+Image';
            }}
          />
        </div>
        <div>
          <h2 style={{ marginTop: 0 }}>{product.name}</h2>
          <p>SKU: {product.sku}</p>
          <p style={{ fontSize: 20, fontWeight: 600 }}>{formattedPrice}</p>

          <p>
            Status: {inStock ? (
              <span style={{ color: 'green', fontWeight: 600 }}>In Stock</span>
            ) : (
              <span style={{ color: 'red', fontWeight: 600 }}>Out of Stock</span>
            )}
            {stock && typeof stock.qty === 'number' && (
              <span style={{ marginLeft: 8, color: '#666' }}>(Qty: {stock.qty})</span>
            )}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <label htmlFor="qty">Qty</label>
            <input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ width: 80, padding: 6 }}
            />
            <button
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              style={{
                padding: '10px 16px',
                background: inStock ? '#1976d2' : '#aaa',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: inStock && !adding ? 'pointer' : 'not-allowed',
              }}
            >
              {adding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>

          {message && (
            <p style={{ marginTop: 12, color: message.includes('success') ? 'green' : 'red' }}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
