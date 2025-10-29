# Magento 2 Product Integration

This React application fetches and displays products from a Magento 2 store using both REST API and GraphQL.

## Features

- ✅ Fetch products from Magento 2 REST API
- ✅ Fetch products from Magento 2 GraphQL API
- ✅ Side-by-side API comparison view
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

### REST API
- **Products List**: `GET /rest/V1/products`
- **Single Product**: `GET /rest/V1/products/{sku}`

### GraphQL API
- **Products Query**: `POST /graphql` with `GetProducts` query
- **Single Product**: `POST /graphql` with `GetProductBySku` query
- **Search Products**: `POST /graphql` with `SearchProducts` query

## Search Criteria

The application automatically applies these filters for both APIs:
- **Visibility**: Only products visible in catalog (visibility = 4)
- **Status**: Only enabled products (status = 1)
- **Pagination**: Configurable page size (default: 12 products per page)

### GraphQL Specific Features
- **Flexible Querying**: Request only needed fields
- **Nested Data**: Access related data like categories, media gallery
- **Type Safety**: Strongly typed queries and responses
- **Caching**: Apollo Client provides intelligent caching

## CORS Handling

For localhost connections, CORS proxy is disabled by default. For remote Magento instances, the application can use CORS proxy services if needed.

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

### API Comparison
Edit `src/components/ProductComparison.js` to customize:
- Side-by-side comparison layout
- API performance metrics
- Error handling differences

### Styling
Update `src/components/ProductList.css` for:
- Grid layout adjustments
- Color scheme changes
- Responsive breakpoints

### REST API Parameters
Modify `src/services/magentoApi.js` to:
- Add additional search filters
- Change default page size
- Include custom attributes
- Add sorting options

### GraphQL Queries
Modify `src/services/graphqlApi.js` to:
- Add new GraphQL queries
- Include additional product fields
- Customize query variables
- Add new search capabilities