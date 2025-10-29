/**
 * Magento 2 API Service
 * Handles communication with Magento 2 GraphQL API
 */

import { GraphQLClient } from 'graphql-request';
import { getCorsProxyUrl, needsCorsProxy } from '../utils/corsProxy';

const MAGENTO_BASE_URL = 'http://localhost:8080/magento2/pub';
const GRAPHQL_ENDPOINT = `${MAGENTO_BASE_URL}/graphql`;
const USE_CORS_PROXY = needsCorsProxy(MAGENTO_BASE_URL);

// Initialize GraphQL client
const getGraphQLClient = () => {
  const endpoint = getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY);
  return new GraphQLClient(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

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
      const client = getGraphQLClient();
      
      // GraphQL query for fetching products
      const query = `
        query GetProducts($pageSize: Int!, $currentPage: Int!, $filter: ProductAttributeFilterInput) {
          products(
            pageSize: $pageSize
            currentPage: $currentPage
            filter: $filter
          ) {
            total_count
            page_info {
              current_page
              page_size
              total_pages
            }
            items {
              id
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
              media_gallery {
                url
                label
                position
              }
              status
              visibility
              type_id
              created_at
              updated_at
              short_description {
                html
              }
              description {
                html
              }
              url_key
              stock_status
            }
          }
        }
      `;

      // Build filter for visible and enabled products
      const filter = {
        visibility: { eq: "4" }, // Catalog, Search
        status: { eq: 1 } // Enabled
      };

      const variables = {
        pageSize,
        currentPage,
        filter
      };

      console.log('Fetching products via GraphQL from:', GRAPHQL_ENDPOINT);
      console.log('Using CORS proxy:', USE_CORS_PROXY);
      console.log('Variables:', variables);

      const data = await client.request(query, variables);
      
      // Transform GraphQL response to match REST API format
      const products = data.products.items.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price_range?.minimum_price?.final_price?.value || 0,
        status: product.status,
        visibility: product.visibility,
        type_id: product.type_id,
        created_at: product.created_at,
        updated_at: product.updated_at,
        media_gallery_entries: product.media_gallery?.map(media => ({
          file: media.url,
          label: media.label,
          position: media.position,
          types: ['image']
        })) || [],
        // Add main image as first media gallery entry if available
        ...(product.image?.url && {
          media_gallery_entries: [
            {
              file: product.image.url,
              label: product.image.label,
              position: 0,
              types: ['image', 'small_image', 'thumbnail']
            },
            ...(product.media_gallery?.map(media => ({
              file: media.url,
              label: media.label,
              position: media.position,
              types: ['image']
            })) || [])
          ]
        }),
        short_description: product.short_description?.html || '',
        description: product.description?.html || '',
        url_key: product.url_key,
        stock_status: product.stock_status
      }));

      return {
        items: products,
        totalCount: data.products.total_count,
        searchCriteria: {
          page_size: data.products.page_info.page_size,
          current_page: data.products.page_info.current_page,
          total_pages: data.products.page_info.total_pages
        }
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
      const client = getGraphQLClient();
      
      // GraphQL query for fetching a single product by SKU
      const query = `
        query GetProductBySku($sku: String!) {
          products(filter: { sku: { eq: $sku } }) {
            items {
              id
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
              media_gallery {
                url
                label
                position
              }
              status
              visibility
              type_id
              created_at
              updated_at
              short_description {
                html
              }
              description {
                html
              }
              url_key
              stock_status
              categories {
                id
                name
                url_key
              }
              custom_attributes {
                attribute_code
                value
              }
            }
          }
        }
      `;

      const variables = { sku };

      console.log(`Fetching product ${sku} via GraphQL from:`, GRAPHQL_ENDPOINT);

      const data = await client.request(query, variables);
      
      if (!data.products.items || data.products.items.length === 0) {
        throw new Error(`Product with SKU ${sku} not found`);
      }

      const product = data.products.items[0];
      
      // Transform GraphQL response to match REST API format
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price_range?.minimum_price?.final_price?.value || 0,
        status: product.status,
        visibility: product.visibility,
        type_id: product.type_id,
        created_at: product.created_at,
        updated_at: product.updated_at,
        media_gallery_entries: product.media_gallery?.map(media => ({
          file: media.url,
          label: media.label,
          position: media.position,
          types: ['image']
        })) || [],
        // Add main image as first media gallery entry if available
        ...(product.image?.url && {
          media_gallery_entries: [
            {
              file: product.image.url,
              label: product.image.label,
              position: 0,
              types: ['image', 'small_image', 'thumbnail']
            },
            ...(product.media_gallery?.map(media => ({
              file: media.url,
              label: media.label,
              position: media.position,
              types: ['image']
            })) || [])
          ]
        }),
        short_description: product.short_description?.html || '',
        description: product.description?.html || '',
        url_key: product.url_key,
        stock_status: product.stock_status,
        categories: product.categories || [],
        custom_attributes: product.custom_attributes || []
      };
    } catch (error) {
      console.error(`Error fetching product ${sku} via GraphQL:`, error);
      throw new Error(`Failed to fetch product ${sku}: ${error.message}`);
    }
  }

  /**
   * Get product image URL
   * @param {string} imagePath - Image path from product data (can be full URL or relative path)
   * @returns {string} Full image URL
   */
  getImageUrl(imagePath) {
    if (!imagePath) return null;
    
    // If it's already a full URL (from GraphQL), return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Handle relative paths (from REST API or partial GraphQL responses)
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