/**
 * Magento 2 API Service
 * Handles communication with Magento 2 GraphQL API
 */

import { getCorsProxyUrl, needsCorsProxy } from '../utils/corsProxy';

const MAGENTO_BASE_URL = 'http://localhost:8080/magento2/pub';
const GRAPHQL_ENDPOINT = `${MAGENTO_BASE_URL}/graphql`;
const USE_CORS_PROXY = needsCorsProxy(MAGENTO_BASE_URL);

class MagentoApiService {
  /**
   * Fetch products from Magento 2 using GraphQL
   * @param {Object} params - Query parameters
   * @param {number} params.pageSize - Number of products per page (default: 20)
   * @param {number} params.currentPage - Current page number (default: 1)
   * @param {string} params.searchCriteria - Additional search criteria
   * @returns {Promise<Object>} Products data
   */
  async fetchProducts(params = {}) {
    const {
      pageSize = 20,
      currentPage = 1,
      searchCriteria = ''
    } = params;

    try {
      // GraphQL query for fetching products
      const query = `
        query GetProducts($pageSize: Int!, $currentPage: Int!) {
          products(
            pageSize: $pageSize
            currentPage: $currentPage
            filter: {
              visibility: { eq: "4" }
            }
          ) {
            total_count
            items {
              id
              uid
              name
              sku
              price_range {
                minimum_price {
                  regular_price {
                    value
                    currency
                  }
                  final_price {
                    value
                    currency
                  }
                }
              }
              image {
                url
                label
              }
              small_image {
                url
                label
              }
              thumbnail {
                url
                label
              }
              media_gallery {
                url
                label
              }
            }
            page_info {
              page_size
              current_page
              total_pages
            }
          }
        }
      `;

      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);
      
      console.log('Fetching products via GraphQL from:', url);
      console.log('Using CORS proxy:', USE_CORS_PROXY);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            pageSize,
            currentPage
          }
        }),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }

      const data = result.data.products;
      
      // Transform GraphQL response to match REST API format
      const items = data.items.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        price: item.price_range?.minimum_price?.final_price?.value || 
               item.price_range?.minimum_price?.regular_price?.value || 0,
        status: 1, // GraphQL doesn't return disabled products by default
        media_gallery_entries: item.media_gallery?.map((media, index) => ({
          id: index,
          file: media.url,
          label: media.label,
          types: ['image']
        })) || []
      }));
      
      return {
        items: items,
        totalCount: data.total_count || 0,
        pageInfo: data.page_info || {}
      };
    } catch (error) {
      console.error('Error fetching products from Magento GraphQL:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Fetch a single product by SKU using GraphQL
   * @param {string} sku - Product SKU
   * @returns {Promise<Object>} Product data
   */
  async fetchProductBySku(sku) {
    try {
      // GraphQL query for fetching a single product by SKU
      const query = `
        query GetProductBySku($sku: String!) {
          products(filter: { sku: { eq: $sku } }) {
            items {
              id
              uid
              name
              sku
              price_range {
                minimum_price {
                  regular_price {
                    value
                    currency
                  }
                  final_price {
                    value
                    currency
                  }
                }
              }
              description {
                html
              }
              short_description {
                html
              }
              image {
                url
                label
              }
              small_image {
                url
                label
              }
              thumbnail {
                url
                label
              }
              media_gallery {
                url
                label
                disabled
              }
              stock_status
            }
          }
        }
      `;

      const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { sku }
        }),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }

      if (!result.data.products.items || result.data.products.items.length === 0) {
        throw new Error(`Product with SKU ${sku} not found`);
      }

      const item = result.data.products.items[0];
      
      // Transform GraphQL response to match REST API format
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        price: item.price_range?.minimum_price?.final_price?.value || 
               item.price_range?.minimum_price?.regular_price?.value || 0,
        description: item.description?.html || '',
        short_description: item.short_description?.html || '',
        status: item.stock_status === 'IN_STOCK' ? 1 : 0,
        media_gallery_entries: item.media_gallery?.map((media, index) => ({
          id: index,
          file: media.url,
          label: media.label,
          disabled: media.disabled || false,
          types: ['image']
        })) || []
      };
    } catch (error) {
      console.error(`Error fetching product ${sku}:`, error);
      throw new Error(`Failed to fetch product ${sku}: ${error.message}`);
    }
  }

  /**
   * Get product image URL
   * @param {string} imagePath - Image path from product data (can be full URL from GraphQL or path from REST)
   * @returns {string} Full image URL
   */
  getImageUrl(imagePath) {
    if (!imagePath) return null;
    
    // If it's already a full URL (from GraphQL), return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Otherwise, construct the full URL (for REST API compatibility)
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${MAGENTO_BASE_URL}/media/catalog/product/${cleanPath}`;
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