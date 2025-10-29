/**
 * Magento 2 API Service
 * Handles communication with Magento 2 REST API
 */

import { getCorsProxyUrl, needsCorsProxy } from '../utils/corsProxy';

const MAGENTO_BASE_URL = 'http://localhost:8080/magento2/pub';
const API_ENDPOINT = `${MAGENTO_BASE_URL}/rest/V1`;
const GRAPHQL_ENDPOINT = `${MAGENTO_BASE_URL}/graphql`;
const USE_CORS_PROXY = needsCorsProxy(MAGENTO_BASE_URL);

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
    const {
      pageSize = 20,
      currentPage = 1,
      searchCriteria = ''
    } = params;

    try {
      // Build search criteria for Magento 2 API
      let searchParams = new URLSearchParams();
      
      // Add pagination
      searchParams.append('searchCriteria[pageSize]', pageSize);
      searchParams.append('searchCriteria[currentPage]', currentPage);
      
      // Add filter to only get visible products
      searchParams.append('searchCriteria[filterGroups][0][filters][0][field]', 'visibility');
      searchParams.append('searchCriteria[filterGroups][0][filters][0][value]', '4');
      searchParams.append('searchCriteria[filterGroups][0][filters][0][conditionType]', 'eq');
      
      // Add status filter to get only enabled products
      searchParams.append('searchCriteria[filterGroups][1][filters][0][field]', 'status');
      searchParams.append('searchCriteria[filterGroups][1][filters][0][value]', '1');
      searchParams.append('searchCriteria[filterGroups][1][filters][0][conditionType]', 'eq');

      const url = getCorsProxyUrl(`${API_ENDPOINT}/products?${searchParams.toString()}`, USE_CORS_PROXY);
      
      console.log('Fetching products from:', url);
      console.log('Using CORS proxy:', USE_CORS_PROXY);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Add CORS mode for cross-origin requests
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        items: data.items || [],
        totalCount: data.total_count || 0,
        searchCriteria: data.search_criteria || {}
      };
    } catch (error) {
      console.error('Error fetching products from Magento:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Fetch products from Magento 2 via GraphQL
   * @param {Object} params - Query parameters
   * @param {number} params.pageSize - Number of products per page (default: 20)
   * @param {number} params.currentPage - Current page number (default: 1)
   * @param {string} params.search - Optional free-text search
   * @returns {Promise<Object>} Products data normalized to REST-like shape
   */
  async fetchProductsGraphQL(params = {}) {
    const {
      pageSize = 20,
      currentPage = 1,
      search = ''
    } = params;

    const url = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);

    const query = `
      query GetProducts($pageSize: Int!, $currentPage: Int!, $search: String) {
        products(
          pageSize: $pageSize,
          currentPage: $currentPage,
          search: $search,
          filter: {
            status: { eq: "1" },
            visibility: { eq: "4" }
          }
        ) {
          total_count
          items {
            id
            sku
            name
            status
            small_image { url }
            image { url }
            media_gallery { url label disabled }
            price_range {
              minimum_price {
                final_price { value currency }
                regular_price { value currency }
              }
            }
          }
        }
      }
    `;

    const variables = { pageSize, currentPage, search: search || null };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        const message = json.errors.map((e) => e.message).join('; ');
        throw new Error(message);
      }

      const products = json.data?.products;

      const items = (products?.items || []).map((p) => {
        const finalPrice = p?.price_range?.minimum_price?.final_price?.value ?? null;
        const currency = p?.price_range?.minimum_price?.final_price?.currency ?? 'USD';
        return {
          ...p,
          // Normalize to match existing UI expectations
          price: finalPrice,
          currency,
        };
      });

      return {
        items,
        totalCount: products?.total_count ?? 0,
        searchCriteria: { currentPage, pageSize }
      };
    } catch (error) {
      console.error('Error fetching products via GraphQL:', error);
      throw new Error(`Failed to fetch products via GraphQL: ${error.message}`);
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
    
    // Remove leading slash if present
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