/**
 * Clerk publishable key (client-side, non-secret — it is meant to ship in the
 * browser bundle). An env var wins so production can drop in a `pk_live_` key
 * with no code change; otherwise we fall back to this project's dev instance so
 * auth works out of the box.
 *
 * NOTE: this is the *publishable* key only. The server-side CLERK_SECRET_KEY must
 * never be committed — set it in the server environment (.env.local / host env).
 */
export const CLERK_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  'pk_test_cmFwaWQtc3BhbmllbC0zNS5jbGVyay5hY2NvdW50cy5kZXYk';

/** Whether the Clerk provider + auth UI should be active. */
export const hasClerk: boolean = !!CLERK_PUBLISHABLE_KEY;
