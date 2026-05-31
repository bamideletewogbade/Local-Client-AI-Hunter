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
import { CLERK_PUBLISHABLE_KEY } from './clerkConfig';
import App from './App.tsx';
import './index.css';

// Attach the Clerk session token to same-origin /api requests so the server can
// verify the user and scope their pipeline. No-op until Clerk is loaded + signed
// in, so anonymous traffic is unaffected and the app still works without Clerk.
if (typeof window !== 'undefined' && !(window as any).__clerkFetchPatched) {
  (window as any).__clerkFetchPatched = true;
  const _fetch = window.fetch.bind(window);
  window.fetch = async (input: any, init: any = {}) => {
    try {
      if (typeof input === 'string' && input.includes('/api/')) {
        const clerk = (window as any).Clerk;
        const token = clerk?.session ? await clerk.session.getToken() : null;
        if (token) {
          const headers = new Headers(init.headers || {});
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          init = { ...init, headers };
        }
      }
    } catch {
      /* fall through to an unauthenticated request */
    }
    return _fetch(input, init);
  };
}

// Clerk auth + user management. The publishable key (non-secret) is resolved in
// clerkConfig — env var wins, with the project's dev instance baked as default so
// auth works out of the box. Gated so the app still boots if the key is ever blank.
const tree = (
  <App />
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        {tree}
      </ClerkProvider>
    ) : (
      tree
    )}
  </StrictMode>,
);

