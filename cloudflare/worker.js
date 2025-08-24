export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle Turnstile verification API endpoint
    if (url.pathname === '/api/verify-turnstile' && request.method === 'POST') {
      return await handleTurnstileVerification(request, env);
    }

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

// Turnstile verification function
async function handleTurnstileVerification(request, env) {
  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'No token provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify token with Cloudflare Turnstile API
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    const result = await verifyResponse.json();

    return new Response(JSON.stringify({
      success: result.success,
      error: result.success ? null : 'Verification failed'
    }), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Server error during verification'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}