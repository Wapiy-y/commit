import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** localStorage key holding an explicit choice; absent means "follow device". */
const THEME_KEY = "bilku:theme";

/** The colour-scheme query used when no explicit choice has been made. */
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(): Theme | null {
	try {
		const stored = localStorage.getItem(THEME_KEY);
		return stored === "light" || stored === "dark" ? stored : null;
	} catch {
		// Private mode or storage disabled: fall back to the device setting.
		return null;
	}
}

function systemTheme(): Theme {
	return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Theme state for the whole app.
 *
 * Defaults to the device setting, then remembers an explicit choice in
 * localStorage. The resolved theme is applied as a `dark` class on <html>,
 * which is what the `dark:` variant in index.css keys off.
 *
 * Mounted once, in App.
 */
export function useTheme() {
	const [theme, setTheme] = useState<Theme>(
		() => readStoredTheme() ?? systemTheme(),
	);

	// Apply the theme, and keep the browser UI colour in step.
	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", theme === "dark");

		// Matches the `theme-color` meta tag in index.html.
		const meta = document.querySelector('meta[name="theme-color"]');
		meta?.setAttribute("content", theme === "dark" ? "#09090b" : "#f7f7f5");
	}, [theme]);

	// Follow the device while no explicit choice has been stored.
	useEffect(() => {
		if (readStoredTheme() !== null) return;
		const media = window.matchMedia?.(DARK_QUERY);
		if (!media) return;
		const onChange = (event: MediaQueryListEvent) =>
			setTheme(event.matches ? "dark" : "light");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((prev) => {
			const next: Theme = prev === "dark" ? "light" : "dark";
			try {
				localStorage.setItem(THEME_KEY, next);
			} catch {
				// Persisting is best-effort; the toggle still works this session.
			}
			return next;
		});
	}, []);

	return { theme, isDark: theme === "dark", toggleTheme };
}
