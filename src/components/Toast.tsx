import { X } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

type ToastType = "success" | "error";

interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
}

interface ToastContextValue {
	success: (message: string) => void;
	error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const remove = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const add = useCallback(
		(message: string, type: ToastType) => {
			const id = Date.now();
			setToasts((prev) => [...prev, { id, message, type }]);
			setTimeout(() => remove(id), 2500);
		},
		[remove],
	);

	const success = useCallback((msg: string) => add(msg, "success"), [add]);
	const error = useCallback((msg: string) => add(msg, "error"), [add]);

	return (
		<ToastContext.Provider value={{ success, error }}>
			{children}
			<div className="fixed top-4 inset-x-0 flex flex-col items-center gap-2 z-50 pointer-events-none">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						style={{ animation: "toast-in 0.2s ease-out" }}
						className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow pointer-events-auto ${
							toast.type === "success"
								? "bg-zinc-900 text-white"
								: "bg-red-500 text-white"
						}`}
					>
						<span>{toast.message}</span>
						<button
							onClick={() => remove(toast.id)}
							className="opacity-60 hover:opacity-100 transition-opacity"
						>
							<X size={11} />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
}
