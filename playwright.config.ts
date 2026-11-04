import { defineConfig, devices } from "@playwright/test";

/**
 * Runs the vehicle flows in a real Chromium against the harness in e2e/.
 *
 * Playwright is limited to one worker: the mock holds module-level state, and two
 * specs sharing a browser would see each other's vehicles.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1,
	// Generous per-test timeout: the harness compiles on demand under vite dev,
	// and a cold transform on a slow runner can take most of the default 30s.
	timeout: 60_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
	webServer: {
		command: "npm run e2e:serve",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		// Surface the server's own output when it fails to start; a silent
		// webServer timeout tells you nothing about why it never bound.
		stdout: "pipe",
		stderr: "pipe",
	},
});
