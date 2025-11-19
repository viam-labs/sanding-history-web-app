import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if ('serviceWorker' in navigator) {
  console.log('🔧 Service Worker is supported');
  window.addEventListener('load', () => {
    console.log('🔧 Window loaded, attempting SW registration');
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('✅ SW registered:', registration);
      
      // If there's no controller, the page needs to be reloaded once
      if (!navigator.serviceWorker.controller) {
        console.log('⚠️ No controller on first load - SW will control after reload');
      }
    }).catch(registrationError => {
      console.error('❌ SW registration failed:', registrationError);
    });

    navigator.serviceWorker.ready.then(() => {
      console.log('✅ Service worker is ready');
    });
  });
} else {
  console.error('❌ Service Worker is NOT supported');
}

// Export function to update token from App component
export async function updateServiceWorkerToken(token: string) {
  console.log('🔑 updateServiceWorkerToken called with token length:', token.length);
  
  // Wait for service worker to be ready
  await navigator.serviceWorker.ready;
  
  // Wait a bit longer for controller to be available (first load issue)
  let attempts = 0;
  while (!navigator.serviceWorker.controller && attempts < 20) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_TOKEN',
      token: token
    });
    console.log('✅ Token sent to service worker');
  } else {
    console.warn('⚠️ Service worker controller not available - videos may not load');
    console.warn('⚠️ Try refreshing the page once');
  }
  
  // Listen for controller changes (for future SW updates)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service worker controller changed, resending token');
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_TOKEN',
        token: token
      });
      console.log('✅ Token sent after controller change');
    }
  }, { once: true }); // Only listen once
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
