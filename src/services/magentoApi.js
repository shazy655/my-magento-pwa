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

  /**
   * Get detailed product information by SKU using GraphQL
   * @param {string} sku - Product SKU
   * @returns {Promise<Object>} Product details with stock information
   */
  async getProductDetails(sku) {
    try {
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const query = `\
        query GetProduct($sku: String!) {\
          products(filter: { sku: { eq: $sku } }) {\
            items {\
              id\
              name\
              sku\
              description { html }\
              short_description { html }\
              status\
              stock_status\
              small_image { url }\
              image { url }\
              media_gallery {\
                url\
                label\
              }\
              price_range {\
                minimum_price {\
                  regular_price { value currency }\
                  final_price { value currency }\
                  discount { amount_off percent_off }\
                }\
              }\
              ... on ConfigurableProduct {\
                configurable_options {\
                  id\
                  label\
                  values {\
                    label\
                    value_index\
                  }\
                }\
              }\
            }\
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
          variables: { sku },
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

      const products = gql.data?.products?.items || [];
      if (products.length === 0) {
        throw new Error('Product not found');
      }

      return products[0];
    } catch (error) {
      console.error(`Error fetching product details for ${sku}:`, error);
      throw new Error(`Failed to fetch product details: ${error.message}`);
    }
  }

  /**
   * Create a guest cart
   * @returns {Promise<string>} Cart ID (quote ID)
   */
  async createGuestCart() {
    try {
      const url = getCorsProxyUrl(`${API_ENDPOINT}/guest-carts`, USE_CORS_PROXY);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartId = await response.json();
      // Store cart ID in localStorage for persistence
      localStorage.setItem('guest_cart_id', cartId);
      return cartId;
    } catch (error) {
      console.error('Error creating guest cart:', error);
      throw new Error(`Failed to create cart: ${error.message}`);
    }
  }

  /**
   * Create an empty cart using GraphQL mutation
   * @returns {Promise<string>} Cart ID (quote ID)
   */
  async createEmptyCart() {
    try {
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const mutation = `\
        mutation {\
          createEmptyCart\
        }`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          query: mutation,
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

      const cartId = gql.data?.createEmptyCart;
      if (!cartId) {
        throw new Error('No cart ID returned from createEmptyCart mutation');
      }

      // Store cart ID in localStorage for persistence
      localStorage.setItem('guest_cart_id', cartId);
      return cartId;
    } catch (error) {
      console.error('Error creating empty cart with GraphQL:', error);
      throw new Error(`Failed to create empty cart: ${error.message}`);
    }
  }

  /**
   * Get or create a guest cart ID
   * @returns {Promise<string>} Cart ID
   */
  async getGuestCartId() {
    let cartId = localStorage.getItem('guest_cart_id');
    if (!cartId) {
      cartId = await this.createGuestCart();
    }
    return cartId;
  }

  /**
   * Get or create a guest cart ID using GraphQL
   * @returns {Promise<string>} Cart ID
   */
  async getGuestCartIdGraphQL() {
    let cartId = localStorage.getItem('guest_cart_id');
    if (!cartId) {
      cartId = await this.createEmptyCart();
    }
    return cartId;
  }

  /**
   * Add item to guest cart
   * @param {string} sku - Product SKU
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} Cart item response
   */
  async addToGuestCart(sku, quantity = 1) {
    try {
      const cartId = await this.getGuestCartId();
      const url = getCorsProxyUrl(`${API_ENDPOINT}/guest-carts/${cartId}/items`, USE_CORS_PROXY);

      const cartItem = {
        cartItem: {
          sku: sku,
          qty: quantity,
          quote_id: cartId
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(cartItem),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding to cart:', error);
      // If cart is invalid, try creating a new one
      if (error.message.includes('No such entity')) {
        localStorage.removeItem('guest_cart_id');
        return await this.addToGuestCart(sku, quantity);
      }
      throw new Error(`Failed to add item to cart: ${error.message}`);
    }
  }

  /**
   * Add item to guest cart using GraphQL (with createEmptyCart)
   * @param {string} sku - Product SKU
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} Cart item response
   */
  async addToGuestCartGraphQL(sku, quantity = 1) {
    try {
      const cartId = await this.getGuestCartIdGraphQL();
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const mutation = `\
        mutation AddProductsToCart($cartId: String!, $cartItems: [CartItemInput!]!) {\
          addProductsToCart(cartId: $cartId, cartItems: $cartItems) {\
            cart {\
              id\
              items {\
                id\
                product {\
                  name\
                  sku\
                }\
                quantity\
              }\
            }\
            user_errors {\
              code\
              message\
            }\
          }\
        }`;

      const variables = {
        cartId: cartId,
        cartItems: [
          {
            sku: sku,
            quantity: quantity
          }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          query: mutation,
          variables: variables,
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

      const result = gql.data?.addProductsToCart;
      if (result?.user_errors && result.user_errors.length > 0) {
        const message = result.user_errors.map(e => e.message).join('; ');
        throw new Error(message);
      }

      return result;
    } catch (error) {
      console.error('Error adding to cart with GraphQL:', error);
      // If cart is invalid, try creating a new one
      if (error.message.includes('No such entity') || error.message.includes('Could not find a cart')) {
        localStorage.removeItem('guest_cart_id');
        return await this.addToGuestCartGraphQL(sku, quantity);
      }
      throw new Error(`Failed to add item to cart: ${error.message}`);
    }
  }

  /**
   * Get guest cart items
   * @returns {Promise<Array>} Cart items
   */
  async getGuestCartItems() {
    try {
      const cartId = await this.getGuestCartId();
      const url = getCorsProxyUrl(`${API_ENDPOINT}/guest-carts/${cartId}/items`, USE_CORS_PROXY);

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
      console.error('Error fetching cart items:', error);
      return [];
    }
  }

  /**
   * Get guest cart items using GraphQL
   * @returns {Promise<Array>} Cart items
   */
  async getGuestCartItemsGraphQL() {
    try {
      const cartId = await this.getGuestCartIdGraphQL();
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const query = `\
        query GetCart($cartId: String!) {\
          cart(cart_id: $cartId) {\
            id\
            items {\
              id\
              product {\
                id\
                name\
                sku\
                small_image { url }\
                price_range {\
                  minimum_price {\
                    regular_price { value currency }\
                  }\
                }\
              }\
              quantity\
              prices {\
                price { value currency }\
                total_item_discount { value currency }\
                row_total { value currency }\
              }\
            }\
            total_quantity\
            prices {\
              grand_total { value currency }\
              subtotal_excluding_tax { value currency }\
            }\
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
          variables: { cartId },
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

      const cart = gql.data?.cart;
      return cart?.items || [];
    } catch (error) {
      console.error('Error fetching cart items with GraphQL:', error);
      return [];
    }
  }
}

export default new MagentoApiService();