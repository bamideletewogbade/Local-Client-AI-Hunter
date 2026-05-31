// Patch window.fetch and globalThis.fetch to be fully writable via getter/setter on both the instance and prototype chains,
// completely bypassing "Cannot set property fetch of #<Window> which has only a getter" errors from polyfills in sandboxed frames
(() => {
  let activeFetch = window.fetch;

  const makeWritable = (obj: any, key: string) => {
    if (!obj) return;
    try {
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      if (desc && !desc.configurable) {
        return;
      }
      Object.defineProperty(obj, key, {
        get() {
          return activeFetch;
        },
        set(value) {
          activeFetch = value;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      // Fail silently to try other objects in prototype chain
    }
  };

  const targets = [
    window,
    globalThis,
    typeof self !== 'undefined' ? self : null,
    typeof Window !== 'undefined' ? Window.prototype : null,
    typeof window !== 'undefined' ? Object.getPrototypeOf(window) : null,
    typeof EventTarget !== 'undefined' ? EventTarget.prototype : null
  ];

  targets.forEach(target => {
    if (target) {
      makeWritable(target, 'fetch');
    }
  });
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.tsx';
import { AuthProvider } from './components/AuthContext.tsx';
import './index.css';

// Clerk provides auth + user management. ClerkProvider auto-reads
// VITE_CLERK_PUBLISHABLE_KEY. Gate on the key so the app still boots in
// anonymous/local mode before the key is configured.
const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const tree = (
  <AuthProvider>
    <App />
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hasClerkKey ? (
      <ClerkProvider afterSignOutUrl="/">
        {tree}
      </ClerkProvider>
    ) : (
      tree
    )}
  </StrictMode>,
);

