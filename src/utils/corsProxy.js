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
  // Skip proxying if not requested, if URL is relative (same-origin),
  // or if targeting localhost which should be handled via dev proxy
  if (
    !useCorsProxy ||
    !url ||
    url.startsWith('/') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1')
  ) {
    return url;
  }

  // Use the first available CORS proxy
  return `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
};

/**
 * Check if CORS proxy is needed
 * @param {string} baseUrl - Magento base URL
 * @returns {boolean} Whether CORS proxy is needed
 */
export const needsCorsProxy = (baseUrl) => {
  // If running on localhost/127.0.0.1, CORS proxy is usually not needed
  if (!baseUrl || baseUrl.startsWith('/') || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return false;
  }
  
  // For remote Magento instances, CORS proxy might be needed
  return true;
};

export default {
  getCorsProxyUrl,
  needsCorsProxy
};