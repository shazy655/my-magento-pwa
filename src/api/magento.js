const MAGENTO_BASE_PATH = '/magento2/pub';

function getGraphQLEndpoint() {
  return `${MAGENTO_BASE_PATH}/graphql`;
}

function getRestEndpoint(path) {
  return `${MAGENTO_BASE_PATH}/rest${path}`;
}

async function graphqlRequest(query, variables = {}) {
  const response = await fetch(getGraphQLEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GraphQL request failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    const firstError = payload.errors[0]?.message || 'Unknown GraphQL error';
    throw new Error(firstError);
  }
  return payload.data;
}

export async function getProductBySku(sku) {
  const query = `
    query GetProductBySku($sku: String!) {
      products(filter: { sku: { eq: $sku } }) {
        items {
          id
          sku
          name
          url_key
          small_image { url }
          description { html }
          price_range {
            minimum_price { regular_price { value currency } }
          }
        }
        total_count
      }
    }
  `;

  try {
    const data = await graphqlRequest(query, { sku });
    const product = data?.products?.items?.[0] || null;
    if (product) return product;
    throw new Error('Product not found');
  } catch (err) {
    // Fallback to REST if GraphQL fails
    return await getProductBySkuRest(sku);
  }
}

export async function searchProducts(search, pageSize = 10, currentPage = 1) {
  const query = `
    query SearchProducts($search: String, $pageSize: Int, $currentPage: Int) {
      products(search: $search, pageSize: $pageSize, currentPage: $currentPage) {
        items {
          id
          sku
          name
          url_key
          small_image { url }
          price_range {
            minimum_price { regular_price { value currency } }
          }
        }
        total_count
      }
    }
  `;

  const data = await graphqlRequest(query, { search, pageSize, currentPage });
  return {
    items: data?.products?.items || [],
    totalCount: data?.products?.total_count || 0,
  };
}

async function getProductBySkuRest(sku) {
  const url = getRestEndpoint(`/V1/products/${encodeURIComponent(sku)}`);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`REST request failed: ${response.status} ${text}`);
  }
  const product = await response.json();

  // Normalize to GraphQL-like shape for UI reuse
  return {
    id: product?.id,
    sku: product?.sku,
    name: product?.name,
    url_key: product?.custom_attributes?.find?.(a => a.attribute_code === 'url_key')?.value,
    small_image: {
      url: resolveMediaUrl(product, 'small_image'),
    },
    price_range: {
      minimum_price: {
        regular_price: {
          value: Number(product?.price ?? 0),
          currency: 'USD',
        },
      },
    },
    description: {
      html: product?.custom_attributes?.find?.(a => a.attribute_code === 'description')?.value,
    },
  };
}

function resolveMediaUrl(product, attributeCode) {
  const value = product?.custom_attributes?.find?.(a => a.attribute_code === attributeCode)?.value;
  if (!value) return undefined;
  // If Magento is configured to serve media from the same host, this relative path should work
  // Example: /magento2/pub/media/catalog/product/s/m/small-image.jpg
  if (value.startsWith('http')) return value;
  return `${MAGENTO_BASE_PATH}/media/catalog/product${value.startsWith('/') ? '' : '/'}${value}`;
}

export const MagentoApi = {
  getProductBySku,
  searchProducts,
};

export default MagentoApi;
