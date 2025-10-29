/**
 * Magento 2 API Service
 * Handles communication with Magento 2 REST API
 */

import { getCorsProxyUrl, needsCorsProxy } from '../utils/corsProxy';

const MAGENTO_BASE_URL = 'http://localhost:8080/magento2/pub';
const API_ENDPOINT = `${MAGENTO_BASE_URL}/rest/V1`;
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