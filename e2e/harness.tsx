import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import i18n from "@/locale/i18n";
import Vehicle from "@/view/Vehicle";

// Force English so assertions match literal strings instead of depending on the
// device locale. i18n reads localStorage at init, so set it before importing
// would be needed for that path — changeLanguage is equivalent afterwards.
localStorage.setItem("language", "en");
void i18n.changeLanguage("en");

const el = document.getElementById("root") as HTMLElement;
el.innerHTML = "";

ReactDOM.createRoot(el).render(
	<StrictMode>
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-4">
			<div className="max-w-md mx-auto">
				<Vehicle t={i18n.t.bind(i18n) as never} />
			</div>
		</div>
	</StrictMode>,
);
