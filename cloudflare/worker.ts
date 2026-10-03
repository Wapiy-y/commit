/**
 * Cloudflare Worker entry point.
 *
 * `run_worker_first: ["/api/*"]` in wrangler.jsonc sends API traffic here;
 * everything else is served directly by the static-asset worker, which also
 * falls back to index.html for client-side routes.
 *
 * The request is reconstructed as an absolute URL before handing it to Hono.
 * `new Request("/api/...")` is not a valid absolute URL, and the API relies on
 * `new URL(...).origin` for the JWT issuer check.
 *
 * The execution context is typed structurally rather than as the ambient
 * Workers `ExecutionContext`, because `@cloudflare/workers-types` conflicts with
 * the DOM lib this app also compiles against.
 */

import type { Bindings } from "./api";
import api from "./api";

interface WorkerEnv extends Bindings {
	/** The static-assets binding; the only part of `env` used here. */
	ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
	async fetch(
		request: Request,
		env: WorkerEnv,
		ctx: unknown,
	): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
			return api.fetch(
				new Request(url.toString(), request),
				env,
				ctx as Parameters<typeof api.fetch>[2],
			);
		}

		return env.ASSETS.fetch(request);
	},
};
