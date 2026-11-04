import type React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
	label: string;
	children: React.ReactNode;
	hint?: string;
}

export function FormField({ label, children, hint }: FormFieldProps) {
	return (
		<div>
			<label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
				{label}
			</label>
			{children}
			{hint && (
				<p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
					{hint}
				</p>
			)}
		</div>
	);
}

export const inputClass =
	"w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm";

interface FormActionsProps {
	onCancel: () => void;
	submitLabel: string;
	savingLabel?: string;
	isSaving: boolean;
	disabled?: boolean;
	cancelLabel: string;
	danger?: boolean;
}

export function FormActions({
	onCancel,
	submitLabel,
	savingLabel,
	isSaving,
	disabled,
	cancelLabel,
}: FormActionsProps) {
	return (
		<div className="flex gap-3">
			<button
				type="button"
				onClick={onCancel}
				className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
			>
				{cancelLabel}
			</button>
			<button
				type="submit"
				disabled={isSaving || disabled}
				className={cn(
					"flex-1 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
					"hover:bg-zinc-800 dark:hover:bg-zinc-200",
				)}
			>
				{isSaving ? (savingLabel ?? submitLabel) : submitLabel}
			</button>
		</div>
	);
}

export function FormError({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
			<p className="text-xs text-red-700 dark:text-red-300">{message}</p>
		</div>
	);
}

export function FormWarning({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
			<p className="text-xs text-amber-700 dark:text-amber-300">{message}</p>
		</div>
	);
}
