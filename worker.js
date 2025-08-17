import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    try {
      // Try to serve the static asset
      return await getAssetFromKV(request);
    } catch (e) {
      // For SPA routing - serve index.html for unknown routes
      const url = new URL(request.url);
      if (!url.pathname.includes('.')) {
        try {
          const indexRequest = new Request(url.origin + '/index.html', request);
          return await getAssetFromKV(indexRequest);
        } catch (indexError) {
          return new Response('Not found', { status: 404 });
        }
      }
      return new Response('Not found', { status: 404 });
    }
  }
};