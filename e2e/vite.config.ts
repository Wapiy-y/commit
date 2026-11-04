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
	server: { port: 4173, strictPort: true },
});
