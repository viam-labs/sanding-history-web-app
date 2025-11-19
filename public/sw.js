console.log('🚀 Service Worker script loaded');

let authToken = null;

self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing');
  // Skip waiting immediately to take control
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  // Claim all clients immediately
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('✅ Service Worker claimed all clients');
    })
  );
});

self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);
  if (event.data && event.data.type === 'SET_TOKEN') {
    authToken = event.data.token;
    console.log('🔐 Service Worker: Auth token received, length:', authToken.length);
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept requests to /files/
  if (url.pathname.startsWith('/files/')) {
    console.log('🎯 Service Worker: Intercepting /files/ request:', url.pathname);
    event.respondWith(handleVideoRequest(event.request));
  }
});

async function handleVideoRequest(request) {
  console.log('Service Worker: Intercepting request to', request.url);

  // Check if we have an auth token
  if (!authToken) {
    console.warn('Service Worker: No auth token available');
    return new Response('Unauthorized - No token', {
      status: 401,
      statusText: 'Unauthorized'
    });
  }

  const url = new URL(request.url);
  const targetUrl = `https://app.viam.com${url.pathname}`;
  console.log('Service Worker: Proxying to', targetUrl);

  const headers = new Headers(request.headers);
  if (authToken) {
    headers.set('Authorization', `Basic ${authToken}`);
  }

  // Preserve Range header for video seeking
  if (request.headers.get('Range')) {
    headers.set('Range', request.headers.get('Range'));
  }
  headers.set('Cache-Control', 'no-cache');

  // Create a new request with the modified headers and target URL
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow'
  });

  try {
    const response = await fetch(modifiedRequest);
    console.log('Service Worker: Response status', response.status);

    // Handle auth failures
    if (response.status === 401) {
      console.warn('Service Worker: Auth token invalid or expired');
    }

    return response;
  } catch (error) {
    console.error('Service Worker: Fetch failed', error);
    return new Response('Network error', {
      status: 502,
      statusText: 'Bad Gateway'
    });
  }
}
