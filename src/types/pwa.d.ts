/// <reference types="vite-plugin-pwa/client" />

/**
 * Injected by vite.config.ts `define`. Differs on every deploy, and is compared
 * against version.json so a stale page can recognise itself.
 */
declare const __BUILD_ID__: string;
