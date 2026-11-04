import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import { BillFormModal } from "@/components/BillFormModal";
import i18n from "@/locale/i18n";
import Vehicle from "@/view/Vehicle";

// Force English so assertions match literal strings instead of depending on the
// device locale. i18n reads localStorage at init, so set it before importing
// would be needed for that path — changeLanguage is equivalent afterwards.
localStorage.setItem("language", "en");
void i18n.changeLanguage("en");

const el = document.getElementById("root") as HTMLElement;
el.innerHTML = "";

// The bill modals are only reachable through the auth-gated app, so the harness
// mounts them directly: they share the same input markup that overflows on iOS.
const t = i18n.t.bind(i18n) as never;
const view = new URLSearchParams(window.location.search).get("view");

ReactDOM.createRoot(el).render(
	<StrictMode>
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-4">
			<div className="max-w-md mx-auto">
				{view === "bill" || view === "edit-bill" ? (
					<BillFormModal
						mode={view === "edit-bill" ? "edit" : "create"}
						initialValues={
							view === "edit-bill"
								? {
										name: "Electricity",
										amount: "100",
										due_day: "5",
										start_date: "2026-11-01",
										duration_months: "",
										category: "electric",
										notes: "",
									}
								: undefined
						}
						onClose={() => undefined}
						onSubmit={async () => undefined}
						t={t}
					/>
				) : (
					<Vehicle t={t} />
				)}
			</div>
		</div>
	</StrictMode>,
);
