import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Builds the e2e harness: the real components, with only the network layer
 * replaced by e2e/mock-vehicles.ts. Aliased by exact path so `@/api/vehicles`
 * resolves to the mock while every other `@/` import stays real.
 */
export default defineConfig({
	root: resolve(__dirname),
	// The app's vite config injects this; without it any module importing
	// @/lib/build throws a ReferenceError and nothing renders.
	define: {
		__BUILD_ID__: JSON.stringify("e2e"),
	},
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{
				find: /^@\/api\/vehicles$/,
				replacement: resolve(__dirname, "./mock-vehicles.ts"),
			},
			{ find: "@", replacement: resolve(__dirname, "../src") },
		],
	},
	// Pinned to IPv4 on purpose: Vite's default "localhost" binds whatever it
	// resolves to, and Playwright's webServer probes 127.0.0.1 — on a runner where
	// localhost resolves to ::1 first, the probe times out with no error output.
	server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
