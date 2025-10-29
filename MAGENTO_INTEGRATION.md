# Magento 2 Product Integration

This React application fetches and displays products from a Magento 2 store using the REST API.

## Features

- ✅ Fetch products from Magento 2 REST API
- ✅ Display products in a responsive grid layout
- ✅ Pagination support
- ✅ Loading states and error handling
- ✅ Product images with fallback
- ✅ Price formatting
- ✅ Product status indicators
- ✅ CORS proxy support for remote instances

## Configuration

The application is currently configured to connect to:
```
http://localhost:8080/magento2/pub
```

To change the Magento URL, edit the `MAGENTO_BASE_URL` constant in:
```
src/services/magentoApi.js
```

## API Endpoints Used

- **Products List**: `GET /rest/V1/products`
- **Single Product**: `GET /rest/V1/products/{sku}`

## Search Criteria

The application automatically applies these filters:
- **Visibility**: Only products visible in catalog (visibility = 4)
- **Status**: Only enabled products (status = 1)
- **Pagination**: Configurable page size (default: 12 products per page)

## CORS Handling

The application handles CORS issues in multiple ways:

### Development Mode
- **Webpack Dev Server Proxy**: In development, the webpack dev server proxies requests to `/magento2` to `http://localhost:8080`, eliminating CORS issues
- **Automatic Detection**: The application automatically detects development mode and uses proxied URLs

### Production Mode
- **CORS Proxy Services**: For remote Magento instances, the application can use CORS proxy services
- **Direct Connection**: For localhost connections in production, direct API calls are made

### Configuration
The CORS handling is automatic and requires no manual configuration. The system:
1. Detects if running in development mode (`NODE_ENV !== 'production'`)
2. Uses webpack proxy for development (`/magento2/pub/graphql` → `http://localhost:8080/magento2/pub/graphql`)
3. Falls back to CORS proxy services for remote production instances

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Magento 2 Setup Requirements

Ensure your Magento 2 instance has:

1. **REST API enabled** (enabled by default)
2. **CORS headers configured** (if accessing from different domain)
3. **Products with proper visibility and status**

### Optional: Configure CORS in Magento 2

If you encounter CORS issues, add these headers to your Magento 2 `.htaccess` or web server configuration:

```apache
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, DELETE, PUT"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
```

## Error Handling

The application handles common scenarios:
- Network connectivity issues
- Invalid API responses
- Missing product data
- Image loading failures
- Empty product catalogs

## Performance Considerations

- Images are lazy-loaded with fallback placeholders
- API responses are cached by the browser
- Pagination reduces initial load time
- Responsive design optimizes for mobile devices

## Customization

### Modify Product Display
Edit `src/components/ProductList.js` to customize:
- Product card layout
- Displayed product information
- Pagination settings

### Styling
Update `src/components/ProductList.css` for:
- Grid layout adjustments
- Color scheme changes
- Responsive breakpoints

### API Parameters
Modify `src/services/magentoApi.js` to:
- Add additional search filters
- Change default page size
- Include custom attributes
- Add sorting options