/**
 * True when the Express API in server.ts is serving this build (local dev, or a self-hosted
 * deployment built with VITE_EXPRESS_API=true). The static Azure host has no /api routes, so the
 * app uses its bundled data there instead of making requests that would always 404.
 */
export const EXPRESS_API_AVAILABLE = import.meta.env.DEV || import.meta.env.VITE_EXPRESS_API === 'true';
