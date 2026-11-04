import { X } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";

interface ModalShellProps {
	title: string;
	subtitle?: string;
	onClose: () => void;
	children: React.ReactNode;
	footer: React.ReactNode;
	/**
	 * Submitting is handled by the shell so the footer lives *inside* the form.
	 * Rendering the submit button beside the form instead of within it is easy to
	 * do by accident, and fails silently: the button submits nothing at all.
	 */
	onSubmit?: (event: React.FormEvent) => void;
}

/**
 * Shared bottom-sheet/centred-dialog chrome, matching BillFormModal. Portalled to
 * document.body so a modal opened inside a scrolled list is not clipped by it.
 */
export function ModalShell({
	title,
	subtitle,
	onClose,
	children,
	footer,
	onSubmit,
}: ModalShellProps) {
	const modal = (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90dvh] flex flex-col">
				<div className="flex justify-center pt-3 pb-1 sm:hidden">
					<div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
				</div>
				<div className="flex items-start justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
					<div>
						<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
							{title}
						</h2>
						{subtitle && (
							<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
								{subtitle}
							</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
					>
						<X size={16} />
					</button>
				</div>
				<form
					onSubmit={onSubmit}
					className="flex flex-col flex-1 min-h-0"
					noValidate={false}
				>
					<div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
					<div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
						{footer}
					</div>
				</form>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
