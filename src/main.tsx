import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./locale/i18n.ts";
import { ToastProvider } from "./components/Toast";
import { setupPwa } from "./lib/pwa";

// Before the first render: a new worker taking control reloads the page.
setupPwa();

const rootElement = document.getElementById("root");

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ToastProvider>
				<App />
			</ToastProvider>
		</StrictMode>,
	);
}
