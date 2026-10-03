import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["dist"]),
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
	},
	{
		// Backend: Netlify Functions run on Node, so they need server globals
		// and none of the React rules. Scoped to its own block so the backend
		// can be linted and gated independently of the app code.
		files: ["netlify/functions/**/*.mjs"],
		extends: [js.configs.recommended],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: globals.node,
		},
	},
]);
