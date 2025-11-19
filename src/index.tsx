import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if ('serviceWorker' in navigator) {
  console.log('🔧 Service Worker is supported');
  window.addEventListener('load', () => {
    console.log('🔧 Window loaded, attempting SW registration');
    
    // Check if we just reloaded for SW activation
    const swReloaded = sessionStorage.getItem('sw-reloaded');
    
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('✅ SW registered:', registration);
      
      // On first registration without controller, reload once
      if (!navigator.serviceWorker.controller && !swReloaded) {
        console.log('🔄 First time SW registration - reloading to activate');
        sessionStorage.setItem('sw-reloaded', 'true');
        window.location.reload();
        return;
      }
      
      // Clear the flag after successful activation
      if (navigator.serviceWorker.controller && swReloaded) {
        sessionStorage.removeItem('sw-reloaded');
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
  console.log('🔑 Sending auth token to service worker');
  
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
    console.error('❌ Service worker controller not available');
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
  }, { once: true });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
