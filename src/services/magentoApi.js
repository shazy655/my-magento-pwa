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
            
            }\
          ) {\
            total_count\
            items {\
              id\
              name\
              sku\
              __typename\
              small_image { url }\
              price_range {\
                minimum_price {\
                  regular_price { value currency }\
                  final_price { value currency }\
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
        const finalPrice = item?.price_range?.minimum_price?.final_price;
        const imageUrl = item?.small_image?.url || null;

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          type: item.__typename,
          // Maintain existing UI expectations
          price: regularPrice?.value ?? null,
          price_currency: regularPrice?.currency ?? 'USD',
          final_price: finalPrice?.value ?? regularPrice?.value,
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
          // Add configurable options for configurable products
          configurable_options: item.configurable_options || [],
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
              __typename\
              description { html }\
              short_description { html }\
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
                variants {\
                  product {\
                    sku\
                    name\
                    small_image { url }\
                    price_range {\
                      minimum_price {\
                        regular_price { value currency }\
                        final_price { value currency }\
                      }\
                    }\
                  }\
                  attributes {\
                    code\
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
   * Get configurable product variants
   * @param {string} sku - Product SKU
   * @returns {Promise<Array>} Product variants
   */
  async getConfigurableProductVariants(sku) {
    try {
      const product = await this.getProductDetails(sku);
      return product.variants || [];
    } catch (error) {
      console.error(`Error fetching variants for ${sku}:`, error);
      return [];
    }
  }

  /**
   * Create an empty cart using GraphQL mutation
   * @returns {Promise<string>} Cart ID (quote ID)
   */
  async createEmptyCart() {
    try {
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const mutation = `\\
        mutation {\\
          createEmptyCart\\
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
        throw new Error('Failed to create empty cart: No cart ID returned');
      }

      // Store cart ID in localStorage for persistence
      localStorage.setItem('guest_cart_id', cartId);
      return cartId;
    } catch (error) {
      console.error('Error creating empty cart (GraphQL):', error);
      throw new Error(`Failed to create empty cart: ${error.message}`);
    }
  }

  /**
   * Get or create a guest cart ID
   * Uses GraphQL createEmptyCart mutation by default
   * @param {boolean} useRestApi - If true, uses REST API instead of GraphQL (default: false)
   * @returns {Promise<string>} Cart ID
   */
  async getGuestCartId(useRestApi = false) {
    let cartId = localStorage.getItem('guest_cart_id');
    if (!cartId) {
      cartId = await this.createEmptyCart();
    }
    return cartId;
  }

  /**
   * Add simple product to guest cart
   * @param {string} sku - Product SKU
   * @param {number} quantity - Quantity to add
   * @returns {Promise<Object>} Cart item response
   */
  async addSimpleProductToCart(sku, quantity = 1) {
    try {
      const cartId = await this.getGuestCartId();
      const mutation = `
        mutation AddSimpleProductToCart($cartId: String!, $sku: String!, $quantity: Float!) {
          addSimpleProductsToCart(
            input: {
              cart_id: $cartId
              cart_items: [
                {
                  data: {
                    sku: $sku
                    quantity: $quantity
                  }
                }
              ]
            }
          ) {
            cart {
              items {
                id
                product {
                  name
                  sku
                }
                quantity
              }
            }
          }
        }
      `;

      const variables = { cartId, sku, quantity };
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ query: mutation, variables }),
      });

      const result = await response.json();

      if (result.errors?.length) {
        const message = result.errors.map(e => e.message).join('; ');
        throw new Error(message);
      }

      return result.data?.addSimpleProductsToCart?.cart?.items ?? [];
    } catch (error) {
      console.error('Error adding simple product to cart:', error);
      throw error;
    }
  }

  /**
   * Add configurable product to guest cart
   * @param {string} sku - Product SKU
   * @param {number} quantity - Quantity to add
   * @param {Array} selectedOptions - Selected variant options
   * @returns {Promise<Object>} Cart item response
   */
  async addConfigurableProductToCart(sku, quantity = 1, selectedOptions = []) {
    try {
      const cartId = await this.getGuestCartId();
      const mutation = `
    mutation AddConfigurableToCart($cartId: String!, $sku: String!, $quantity: Float!, $selectedOptions: [ConfigurableProductOptionInput!]!) {
      addConfigurableProductsToCart(
        input: {
          cart_id: $cartId
          cart_items: [
            {
              data: {
                sku: $sku
                quantity: $quantity
              }
              customizable_options: $selectedOptions
            }
          ]
        }
      ) {
        cart {
          items {
            id
            product {
              name
              sku
            }
            quantity
            ... on ConfigurableCartItem {
              configurable_options {
                id
                option_label
                value_label
              }
            }
          }
        }
      }
    }
  `;

      const variables = { cartId, sku, quantity, selectedOptions };
      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ query: mutation, variables }),
      });

      const result = await response.json();

      if (result.errors?.length) {
        const message = result.errors.map(e => e.message).join('; ');
        throw new Error(message);
      }

      return result.data?.addConfigurableProductsToCart?.cart?.items ?? [];
    } catch (error) {
      console.error('Error adding configurable product to cart:', error);
      throw error;
    }
  }

  /**
   * Add item to guest cart (handles both simple and configurable products)
   * @param {string} sku - Product SKU
   * @param {number} quantity - Quantity to add
   * @param {string} productType - Product type (SimpleProduct or ConfigurableProduct)
   * @param {Array} selectedOptions - Selected variant options (for configurable products)
   * @returns {Promise<Object>} Cart item response
   */
  async addToGuestCart(sku, quantity = 1, productType = 'SimpleProduct', selectedOptions = []) {
    try {
      if (productType === 'ConfigurableProduct') {
        return await this.addConfigurableProductToCart(sku, quantity, selectedOptions);
      } else {
        return await this.addSimpleProductToCart(sku, quantity);
      }
    } catch (error) {
      console.error('Error adding to guest cart:', error);
      throw error;
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
}

export default new MagentoApiService();