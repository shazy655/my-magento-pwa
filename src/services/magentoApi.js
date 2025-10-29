/**
 * Magento 2 API Service
 * Handles communication with Magento 2 APIs (GraphQL preferred)
 */

import { getCorsProxyUrl, needsCorsProxy } from '../utils/corsProxy';

// Use relative URL for development to leverage webpack-dev-server proxy
// This avoids CORS issues by making all requests appear to come from the same origin
const MAGENTO_BASE_URL = '/magento2/pub';
const API_ENDPOINT = `${MAGENTO_BASE_URL}/rest/V1`;
const GRAPHQL_ENDPOINT = `${MAGENTO_BASE_URL}/graphql`;
const USE_CORS_PROXY = false; // No need for CORS proxy when using webpack proxy
const LOCAL_STORAGE_GUEST_CART_ID_KEY = 'guest_cart_id';

class MagentoApiService {
  /**
   * Fetch products from Magento 2
   * @param {Object} params - Query parameters
   * @param {number} params.pageSize - Number of products per page (default: 20)
   * @param {number} params.currentPage - Current page number (default: 1)
   * @param {string} params.searchCriteria - Additional search criteria
   * @returns {Promise<Object>} Products data
   */
  async fetchProducts(params = {}) {
    const { pageSize = 20, currentPage = 1 } = params;

    try {
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const query = `\
        query Products($pageSize: Int!, $currentPage: Int!) {\
          products(\
            search: ""\
            pageSize: $pageSize\
            currentPage: $currentPage\
            filter: {\
              visibility: { eq: "4" }\
              status: { eq: "1" }\
            }\
          ) {\
            total_count\
            items {\
              id\
              name\
              sku\
              status\
              small_image { url }\
              price_range {\
                minimum_price {\
                  regular_price { value currency }\
                }\
              }\
            }\
            page_info { current_page page_size total_pages }\
          }\
        }`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          query,
          variables: { pageSize, currentPage },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const gql = await response.json();

      if (gql.errors && gql.errors.length > 0) {
        const message = gql.errors.map(e => e.message).join('; ');
        throw new Error(message);
      }

      const products = (gql.data && gql.data.products) ? gql.data.products : { items: [], total_count: 0, page_info: {} };

      // Normalize to match existing UI expectations
      const normalizedItems = (products.items || []).map(item => {
        const regularPrice = item?.price_range?.minimum_price?.regular_price;
        const imageUrl = item?.small_image?.url || null;

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          // Maintain existing UI expectations
          price: regularPrice?.value ?? null,
          price_currency: regularPrice?.currency ?? 'USD',
          status: typeof item.status === 'number' ? item.status : 1,
          // Emulate REST media_gallery_entries so UI stays unchanged
          media_gallery_entries: imageUrl
            ? [
                {
                  types: ['image'],
                  file: this._toGalleryFilePathOrUrl(imageUrl),
                },
              ]
            : [],
        };
      });

      return {
        items: normalizedItems,
        totalCount: products.total_count || 0,
        searchCriteria: {
          currentPage,
          pageSize,
        },
      };
    } catch (error) {
      console.error('Error fetching products from Magento (GraphQL):', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Fetch a single product by SKU
   * @param {string} sku - Product SKU
   * @returns {Promise<Object>} Product data
   */
  async fetchProductBySku(sku) {
    try {
      const url = getCorsProxyUrl(`${API_ENDPOINT}/products/${encodeURIComponent(sku)}`, USE_CORS_PROXY);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching product ${sku}:`, error);
      throw new Error(`Failed to fetch product ${sku}: ${error.message}`);
    }
  }

  /**
   * Fetch stock status for a SKU
   * @param {string} sku
   * @returns {Promise<{sku: string, stock_status?: string, qty?: number, is_in_stock?: boolean}>}
   */
  async fetchStockStatus(sku) {
    try {
      // Preferred endpoint (provides stock_status and qty)
      const statusUrl = getCorsProxyUrl(
        `${API_ENDPOINT}/stockStatuses/${encodeURIComponent(sku)}`,
        USE_CORS_PROXY
      );

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        return await response.json();
      }

      // Fallback to legacy stockItems endpoint
      const legacyUrl = getCorsProxyUrl(
        `${API_ENDPOINT}/stockItems/${encodeURIComponent(sku)}`,
        USE_CORS_PROXY
      );
      const legacyRes = await fetch(legacyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
      });
      if (!legacyRes.ok) {
        throw new Error(`HTTP error! status: ${legacyRes.status}`);
      }
      const legacy = await legacyRes.json();
      return {
        sku,
        qty: typeof legacy.qty === 'number' ? legacy.qty : undefined,
        is_in_stock: !!legacy.is_in_stock,
        stock_status: legacy.is_in_stock ? 'IN_STOCK' : 'OUT_OF_STOCK',
      };
    } catch (error) {
      console.error(`Error fetching stock for ${sku}:`, error);
      // Graceful fallback: unknown stock
      return { sku };
    }
  }

  /**
   * Create a new guest cart and return its masked ID
   * @returns {Promise<string>}
   */
  async createGuestCart() {
    const url = getCorsProxyUrl(`${API_ENDPOINT}/guest-carts`, USE_CORS_PROXY);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to create guest cart: ${response.status}`);
    }
    // Magento returns a JSON string (masked quote id)
    const maskedId = await response.json();
    if (typeof maskedId !== 'string' || maskedId.length === 0) {
      throw new Error('Magento returned invalid guest cart id');
    }
    return maskedId;
  }

  getGuestCartId() {
    try {
      return localStorage.getItem(LOCAL_STORAGE_GUEST_CART_ID_KEY);
    } catch {
      return null;
    }
  }

  setGuestCartId(cartId) {
    try {
      localStorage.setItem(LOCAL_STORAGE_GUEST_CART_ID_KEY, cartId);
    } catch {
      // ignore storage errors
    }
  }

  clearGuestCartId() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_GUEST_CART_ID_KEY);
    } catch {
      // ignore
    }
  }

  async getOrCreateGuestCartId() {
    const existing = this.getGuestCartId();
    if (existing) return existing;
    const created = await this.createGuestCart();
    this.setGuestCartId(created);
    return created;
  }

  /**
   * Add an item to the guest cart (simple product)
   * @param {{sku: string, qty: number}} params
   * @returns {Promise<Object>} cart item result
   */
  async addItemToGuestCart({ sku, qty }) {
    if (!sku) throw new Error('SKU is required');
    const quantity = Number(qty) || 1;
    const cartId = await this.getOrCreateGuestCartId();
    const url = getCorsProxyUrl(
      `${API_ENDPOINT}/guest-carts/${encodeURIComponent(cartId)}/items`,
      USE_CORS_PROXY
    );
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({
        cartItem: {
          sku,
          qty: quantity,
          quote_id: cartId,
        },
      }),
    });

    if (!response.ok) {
      // If the cart is invalid (e.g. expired), clear and retry once
      if (response.status === 404 || response.status === 400) {
        this.clearGuestCartId();
        const newCartId = await this.getOrCreateGuestCartId();
        const retryUrl = getCorsProxyUrl(
          `${API_ENDPOINT}/guest-carts/${encodeURIComponent(newCartId)}/items`,
          USE_CORS_PROXY
        );
        const retry = await fetch(retryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          mode: 'cors',
          body: JSON.stringify({
            cartItem: {
              sku,
              qty: quantity,
              quote_id: newCartId,
            },
          }),
        });
        if (!retry.ok) {
          const text = await retry.text();
          throw new Error(`Failed to add to cart: ${retry.status} ${text}`);
        }
        return await retry.json();
      }
      const text = await response.text();
      throw new Error(`Failed to add to cart: ${response.status} ${text}`);
    }

    return await response.json();
  }

  /**
   * Get product image URL
   * @param {string} imagePath - Image path from product data
   * @returns {string} Full image URL
   */
  getImageUrl(imagePath) {
    if (!imagePath) return null;

    // If already absolute, return as-is
    if (typeof imagePath === 'string' && (/^https?:\/\//i).test(imagePath)) {
      return imagePath;
    }

    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

    return `${MAGENTO_BASE_URL}/media/catalog/product/${cleanPath}`;
  }

  // Convert an absolute media URL to a gallery file path if possible
  _toGalleryFilePathOrUrl(url) {
    if (typeof url !== 'string') return null;
    try {
      const marker = '/media/catalog/product/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const filePath = url.substring(idx + marker.length);
        return filePath.startsWith('/') ? filePath.slice(1) : filePath;
      }
      return url; // fallback: absolute URL
    } catch {
      return url;
    }
  }

  /**
   * Format price for display
   * @param {number} price - Price value
   * @param {string} currency - Currency code (default: USD)
   * @returns {string} Formatted price
   */
  formatPrice(price, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }
}

export default new MagentoApiService();