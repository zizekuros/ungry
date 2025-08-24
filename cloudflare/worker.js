export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    try {
      // Try to serve the static asset
      const asset = await env.ASSETS.fetch(request);
      
      // If asset exists, return it
      if (asset.status !== 404) {
        return asset;
      }
      
      // For SPA routing - if no asset found and it's not a file, serve index.html
      if (!url.pathname.includes('.')) {
        const indexRequest = new Request(url.origin + '/index.html', request);
        return await env.ASSETS.fetch(indexRequest);
      }
      
      // Return the 404 for actual missing files
      return asset;
      
    } catch (error) {
      // Fallback error handling
      return new Response('Error loading page: ' + error.message, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};