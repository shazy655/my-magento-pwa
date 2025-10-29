import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import magentoApi from '../services/magentoApi';
import './ProductList.css';

const ProductDetail = () => {
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
          magentoApi.fetchStockStatus(sku),
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

  const isInStock = useMemo(() => {
    if (!stock) return undefined;
    if (typeof stock.is_in_stock === 'boolean') return stock.is_in_stock;
    if (typeof stock.stock_status === 'string') {
      return stock.stock_status.toUpperCase() === 'IN_STOCK';
    }
    return undefined;
  }, [stock]);

  const mainImageUrl = useMemo(() => {
    const gallery = product?.media_gallery_entries || [];
    const main = gallery.find((g) => g.types?.includes('image')) || gallery[0];
    if (main?.file) return magentoApi.getImageUrl(main.file);
    const small = product?.custom_attributes?.find((a) => a.attribute_code === 'small_image')?.value;
    if (small) return magentoApi.getImageUrl(small);
    return 'https://via.placeholder.com/600x600?text=No+Image';
  }, [product]);

  const priceDisplay = useMemo(() => {
    const price = product?.price ?? product?.price_info?.final_price ?? null;
    if (price == null) return 'Price not available';
    return magentoApi.formatPrice(price);
  }, [product]);

  const handleAddToCart = async () => {
    if (!sku) return;
    try {
      setAdding(true);
      setError(null);
      setMessage(null);
      await magentoApi.addItemToGuestCart({ sku, qty: Math.max(1, Number(qty) || 1) });
      setMessage('Added to cart');
    } catch (err) {
      setError(err.message || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="product-list-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-list-container">
        <div className="error">
          <h3>Error Loading Product</h3>
          <p>{error}</p>
          <Link to="/" className="retry-button">Back to products</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-list-container">
        <div className="no-products">
          <h3>Product not found</h3>
          <Link to="/" className="retry-button">Back to products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <div style={{ marginBottom: 16 }}>
        <Link to="/" className="retry-button">← Back</Link>
      </div>
      <div className="product-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="product-card">
          <div className="product-image">
            <img
              src={mainImageUrl}
              alt={product.name}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x600?text=No+Image';
              }}
            />
          </div>
        </div>
        <div className="product-card">
          <div className="product-info">
            <h2 className="product-name" style={{ fontSize: 24 }}>{product.name}</h2>
            <p className="product-sku">SKU: {sku}</p>
            <p className="product-price" style={{ fontSize: 20 }}>{priceDisplay}</p>
            {isInStock === true && (
              <span className="product-status available">In stock</span>
            )}
            {isInStock === false && (
              <span className="product-status unavailable">Out of stock</span>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <label htmlFor="qty">Qty</label>
              <input
                id="qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                style={{ width: 80, padding: 8 }}
              />
              <button
                onClick={handleAddToCart}
                className="pagination-button"
                disabled={adding || isInStock === false}
                style={{ padding: '10px 16px' }}
              >
                {adding ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
            {message && <p style={{ color: 'green', marginTop: 12 }}>{message}</p>}
            {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
