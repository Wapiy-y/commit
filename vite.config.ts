import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Identifies this build. Baked into the bundle AND written to version.json, so a
 * running page can tell whether the server has something newer. Time-based rather
 * than a hash because it only has to differ between deploys.
 */
const BUILD_ID = Date.now().toString();

/**
 * Emits version.json next to the assets.
 *
 * It is deliberately NOT precached: the service worker must never serve a cached
 * copy of the file the page uses to detect that it is stale.
 */
function versionFile(): Plugin {
	return {
		name: "bilku-version-file",
		generateBundle() {
			this.emitFile({
				type: "asset",
				fileName: "version.json",
				source: JSON.stringify({ build: BUILD_ID }),
			});
		},
	};
}

export default defineConfig({
	define: {
		__BUILD_ID__: JSON.stringify(BUILD_ID),
	},
	plugins: [
		versionFile(),
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			// The registration is done by hand in main.tsx. The auto-injected
			// snippet only calls register() on load — it never checks for an update
			// and never reloads a page whose worker has been replaced, which is why
			// a deployed change could sit invisible until the app was reinstalled.
			injectRegister: null,
			includeAssets: ["bil.svg"],
			manifest: {
				name: "Bilku",
				short_name: "Bilku",
				description: "Track your monthly bills",
				theme_color: "#18181b",
				background_color: "#f7f7f5",
				display: "standalone",
				orientation: "portrait",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/icon-192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/icon-192-maskable.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/icon-512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "/icon-512-maskable.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
				// A new worker takes over immediately and old precaches are dropped,
				// so an update does not wait for every tab to close.
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
				navigateFallback: "/index.html",
				runtimeCaching: [
					{
						urlPattern: /^\/api\/.*/i,
						handler: "NetworkFirst",
						options: {
							cacheName: "api-cache",
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5, // 5 minutes
							},
						},
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
});
