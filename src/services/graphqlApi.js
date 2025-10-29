/**
 * GraphQL API Service for Magento 2
 * Handles GraphQL communication with Magento 2
 */

import { ApolloClient, InMemoryCache, createHttpLink, gql } from '@apollo/client';
import { getCorsProxyUrl, needsCorsProxy } from '../utils/corsProxy';

const MAGENTO_BASE_URL = 'http://localhost:8080/magento2/pub';
const GRAPHQL_ENDPOINT = `${MAGENTO_BASE_URL}/graphql`;
const USE_CORS_PROXY = needsCorsProxy(MAGENTO_BASE_URL);

// GraphQL Queries
export const GET_PRODUCTS = gql`
  query GetProducts($pageSize: Int, $currentPage: Int, $filter: ProductAttributeFilterInput, $sort: ProductAttributeSortInput) {
    products(
      pageSize: $pageSize
      currentPage: $currentPage
      filter: $filter
      sort: $sort
    ) {
      items {
        id
        sku
        name
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
        status
        visibility
        url_key
        description {
          html
        }
        short_description {
          html
        }
        categories {
          id
          name
          url_path
        }
        created_at
        updated_at
      }
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
    }
  }
`;

export const GET_PRODUCT_BY_SKU = gql`
  query GetProductBySku($sku: String!) {
    products(filter: { sku: { eq: $sku } }) {
      items {
        id
        sku
        name
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
        status
        visibility
        url_key
        description {
          html
        }
        short_description {
          html
        }
        categories {
          id
          name
          url_path
        }
        created_at
        updated_at
      }
    }
  }
`;

export const SEARCH_PRODUCTS = gql`
  query SearchProducts($search: String!, $pageSize: Int, $currentPage: Int, $sort: ProductAttributeSortInput) {
    products(
      search: $search
      pageSize: $pageSize
      currentPage: $currentPage
      sort: $sort
    ) {
      items {
        id
        sku
        name
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
        status
        visibility
        url_key
        description {
          html
        }
        short_description {
          html
        }
        categories {
          id
          name
          url_path
        }
        created_at
        updated_at
      }
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
    }
  }
`;

class GraphQLApiService {
  constructor() {
    this.client = this.createApolloClient();
  }

  createApolloClient() {
    const httpLink = createHttpLink({
      uri: getCorsProxyUrl(GRAPHQL_ENDPOINT, USE_CORS_PROXY),
      fetch: (uri, options) => {
        return fetch(uri, {
          ...options,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
        });
      },
    });

    return new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          errorPolicy: 'all',
        },
        query: {
          errorPolicy: 'all',
        },
      },
    });
  }

  /**
   * Fetch products using GraphQL
   * @param {Object} params - Query parameters
   * @param {number} params.pageSize - Number of products per page (default: 20)
   * @param {number} params.currentPage - Current page number (default: 1)
   * @param {Object} params.filter - Additional filters
   * @param {Object} params.sort - Sort options
   * @returns {Promise<Object>} Products data
   */
  async fetchProducts(params = {}) {
    const {
      pageSize = 20,
      currentPage = 1,
      filter = {},
      sort = {}
    } = params;

    try {
      console.log('Fetching products via GraphQL from:', GRAPHQL_ENDPOINT);
      console.log('Using CORS proxy:', USE_CORS_PROXY);

      const result = await this.client.query({
        query: GET_PRODUCTS,
        variables: {
          pageSize,
          currentPage,
          filter: {
            status: { eq: '1' }, // Only enabled products
            visibility: { eq: '4' }, // Only catalog and search visible
            ...filter
          },
          sort: {
            position: 'ASC',
            ...sort
          }
        },
        fetchPolicy: 'network-only', // Always fetch fresh data
      });

      const { products } = result.data;
      
      return {
        items: products.items || [],
        totalCount: products.total_count || 0,
        pageInfo: products.page_info || {},
        searchCriteria: {
          pageSize,
          currentPage,
          filter,
          sort
        }
      };
    } catch (error) {
      console.error('Error fetching products via GraphQL:', error);
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
      console.log(`Fetching product ${sku} via GraphQL`);

      const result = await this.client.query({
        query: GET_PRODUCT_BY_SKU,
        variables: { sku },
        fetchPolicy: 'network-only',
      });

      const { products } = result.data;
      
      if (!products.items || products.items.length === 0) {
        throw new Error(`Product with SKU ${sku} not found`);
      }

      return products.items[0];
    } catch (error) {
      console.error(`Error fetching product ${sku} via GraphQL:`, error);
      throw new Error(`Failed to fetch product ${sku}: ${error.message}`);
    }
  }

  /**
   * Search products using GraphQL
   * @param {string} searchTerm - Search term
   * @param {Object} params - Additional parameters
   * @returns {Promise<Object>} Search results
   */
  async searchProducts(searchTerm, params = {}) {
    const {
      pageSize = 20,
      currentPage = 1,
      sort = {}
    } = params;

    try {
      console.log(`Searching products for "${searchTerm}" via GraphQL`);

      const result = await this.client.query({
        query: SEARCH_PRODUCTS,
        variables: {
          search: searchTerm,
          pageSize,
          currentPage,
          sort: {
            relevance: 'DESC',
            ...sort
          }
        },
        fetchPolicy: 'network-only',
      });

      const { products } = result.data;
      
      return {
        items: products.items || [],
        totalCount: products.total_count || 0,
        pageInfo: products.page_info || {},
        searchTerm
      };
    } catch (error) {
      console.error(`Error searching products via GraphQL:`, error);
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }

  /**
   * Get product image URL
   * @param {Object} imageData - Image data from GraphQL response
   * @returns {string} Full image URL
   */
  getImageUrl(imageData) {
    if (!imageData || !imageData.url) return null;
    
    // If URL is already absolute, return as is
    if (imageData.url.startsWith('http')) {
      return imageData.url;
    }
    
    // If URL is relative, prepend the base URL
    const cleanUrl = imageData.url.startsWith('/') ? imageData.url.slice(1) : imageData.url;
    return `${MAGENTO_BASE_URL}/${cleanUrl}`;
  }

  /**
   * Get the best available image for a product
   * @param {Object} product - Product data from GraphQL
   * @returns {string} Image URL
   */
  getProductImage(product) {
    // Try different image sources in order of preference
    const imageSources = [
      product.image,
      product.small_image,
      product.thumbnail,
      product.media_gallery?.[0]
    ];

    for (const imageSource of imageSources) {
      const imageUrl = this.getImageUrl(imageSource);
      if (imageUrl) {
        return imageUrl;
      }
    }

    // Fallback to placeholder
    return 'https://via.placeholder.com/300x300?text=No+Image';
  }

  /**
   * Format price for display
   * @param {Object} priceRange - Price range from GraphQL response
   * @returns {string} Formatted price
   */
  formatPrice(priceRange) {
    if (!priceRange || !priceRange.minimum_price) {
      return 'Price not available';
    }

    const { regular_price, final_price } = priceRange.minimum_price;
    const price = final_price || regular_price;
    
    if (!price || !price.value) {
      return 'Price not available';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency || 'USD',
    }).format(price.value);
  }

  /**
   * Get Apollo Client instance
   * @returns {ApolloClient} Apollo Client instance
   */
  getClient() {
    return this.client;
  }
}

export default new GraphQLApiService();