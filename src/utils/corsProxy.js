/**
 * CORS Proxy utility for development
 * Helps handle CORS issues when connecting to Magento 2 API
 */

// Common CORS proxy services for development
const CORS_PROXIES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?'
];

/**
 * Get a CORS proxy URL if needed
 * @param {string} url - Original URL
 * @param {boolean} useCorsProxy - Whether to use CORS proxy
 * @returns {string} Proxied URL or original URL
 */
export const getCorsProxyUrl = (url, useCorsProxy = false) => {
  // In development mode with webpack proxy, don't use CORS proxy
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment || !useCorsProxy || url.includes('localhost') || url.includes('127.0.0.1')) {
    return url;
  }
  
  // Use the first available CORS proxy for production remote instances
  return `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
};

/**
 * Check if CORS proxy is needed
 * @param {string} baseUrl - Magento base URL
 * @returns {boolean} Whether CORS proxy is needed
 */
export const needsCorsProxy = (baseUrl) => {
  // In development, webpack proxy handles CORS
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    return false;
  }
  
  // If running on localhost/127.0.0.1, CORS proxy is usually not needed
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return false;
  }
  
  // For remote Magento instances in production, CORS proxy might be needed
  return true;
};

export default {
  getCorsProxyUrl,
  needsCorsProxy
};