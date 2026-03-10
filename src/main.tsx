import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";
import "./locale/i18n.ts";

const rootElement = document.getElementById("root");

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<App />
			<Toaster position="top-center" expand={false} richColors />
		</StrictMode>,
	);
}
