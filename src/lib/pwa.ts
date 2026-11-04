import { registerSW } from "virtual:pwa-register";

/**
 * Keeps the installed app on the deployed build.
 *
 * Three separate failures had to be covered, because each one alone leaves the
 * user on a stale bundle:
 *
 * 1. The service worker precaches index.html, so a resumed app is served the old
 *    shell and old hashed assets. A new worker therefore has to take control
 *    *and* the page has to reload — that is the controllerchange listener.
 * 2. iOS resumes a home-screen app instead of navigating, so the browser's own
 *    update check may not run for days. Hence the explicit registration.update()
 *    calls on resume, focus and a slow interval.
 * 3. A worker can be wedged badly enough that none of that fires. version.json is
 *    fetched with no-store and compared with the build baked into this bundle; a
 *    mismatch unregisters the worker, drops every cache and reloads once.
 *
 * version.json is deliberately absent from workbox's globPatterns: a precached
 * copy would compare equal forever and the self-heal would never trigger.
 */

const HEAL_KEY = "bilku:healed-build";

let reloading = false;

function reloadOnce() {
	if (reloading) return;
	reloading = true;
	window.location.reload();
}

async function healIfStale() {
	try {
		const res = await fetch("/version.json", { cache: "no-store" });
		if (!res.ok) return;
		const { build } = (await res.json()) as { build?: string };
		if (!build || build === __BUILD_ID__) return;

		// One heal per build id. Without this guard a mismatch that cannot resolve
		// (a proxy rewriting version.json, say) would reload forever.
		if (sessionStorage.getItem(HEAL_KEY) === build) return;
		sessionStorage.setItem(HEAL_KEY, build);

		const registration = await navigator.serviceWorker.getRegistration();
		await registration?.unregister();
		const keys = await caches.keys();
		await Promise.all(keys.map((key) => caches.delete(key)));
		reloadOnce();
	} catch {
		// Offline, or storage blocked: the app still works, it just stays as it is.
	}
}

export function setupPwa() {
	if (!("serviceWorker" in navigator)) return;

	// The fresh worker claims this page (clientsClaim) while it is still running
	// the old bundles, so reload once it is in control.
	navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

	registerSW({
		immediate: true,
		onRegisteredSW(_url, registration) {
			if (!registration) return;
			const check = () => {
				void registration.update().catch(() => {});
			};
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState !== "visible") return;
				check();
				void healIfStale();
			});
			window.addEventListener("focus", check);
			window.setInterval(check, 30 * 60 * 1000);
		},
	});

	void healIfStale();
}
