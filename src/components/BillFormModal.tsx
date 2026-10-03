import { format } from "date-fns";
import type { TFunction } from "i18next";
import { X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { NewBill } from "@/type";
import { Tooltip } from "./Tooltip";

export type BillFormMode = "create" | "edit";

interface BillFormModalProps {
	mode: BillFormMode;
	/** Required when mode is "edit"; ignored when creating. */
	initialValues?: NewBill;
	onClose: () => void;
	onSubmit: (bill: NewBill) => Promise<void>;
	t: TFunction;
}

export const EMPTY_NEW_BILL: NewBill = {
	name: "",
	amount: "",
	due_day: "",
	start_date: format(new Date(), "yyyy-MM-dd"),
	duration_months: "",
	category: "",
	notes: "",
};

/** First day of the current month, used to block past start dates on create. */
const CURRENT_MONTH_START = format(
	new Date(new Date().getFullYear(), new Date().getMonth(), 1),
	"yyyy-MM-dd",
);

/**
 * Shared create/edit form. Editing reuses this instead of a second copy of the
 * fields, so both modes stay in sync. The form intentionally covers the bill
 * definition only — the paid amount lives on `payments` and is never editable
 * here, which is what keeps a paid bill's recorded amount locked.
 */
export function BillFormModal({
	mode,
	initialValues,
	onClose,
	onSubmit,
	t,
}: BillFormModalProps) {
	const isEdit = mode === "edit";
	const [bill, setBill] = useState<NewBill>(initialValues ?? EMPTY_NEW_BILL);
	const [isSaving, setIsSaving] = useState(false);
	const formId = isEdit ? "edit-bill-form" : "add-bill-form";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await onSubmit(bill);
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	const modal = (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div
				className={cn(
					"relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl",
					"animate-in slide-in-from-bottom sm:zoom-in-95 duration-200",
					"max-h-[90dvh] flex flex-col",
				)}
			>
				<div className="flex justify-center pt-3 pb-1 sm:hidden">
					<div className="w-10 h-1 rounded-full bg-zinc-200" />
				</div>

				<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
					<h2 className="text-base font-semibold text-zinc-900">
						{isEdit ? t("edit_bill") : t("add_new_bill")}
					</h2>
					<button
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				<div className="overflow-y-auto flex-1 px-5 py-4">
					<form onSubmit={handleSubmit} id={formId} className="space-y-4">
						<div>
							<div className="flex items-center gap-1 mb-1">
								<label className="block text-xs font-medium text-zinc-500">
									{t("bill_name")}
								</label>
								<Tooltip text={t("tooltip_bill_name")} />
							</div>
							<input
								type="text"
								required
								value={bill.name}
								onChange={(e) => setBill({ ...bill, name: e.target.value })}
								className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								placeholder={t("example_netflix")}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<div className="flex items-center gap-1 mb-1">
									<label className="block text-xs font-medium text-zinc-500">
										{t("amount")}
									</label>
									<Tooltip text={t("tooltip_amount")} />
								</div>
								<input
									type="number"
									step="0.01"
									required
									value={bill.amount}
									onChange={(e) => setBill({ ...bill, amount: e.target.value })}
									className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
									placeholder="0.00"
								/>
							</div>
							<div>
								<div className="flex items-center gap-1 mb-1">
									<label className="block text-xs font-medium text-zinc-500">
										{t("due_day")}
									</label>
									<Tooltip text={t("tooltip_due_day")} align="right" />
								</div>
								<input
									type="number"
									min="1"
									max="31"
									required
									value={bill.due_day}
									onChange={(e) =>
										setBill({ ...bill, due_day: e.target.value })
									}
									className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<div className="flex items-center gap-1 mb-1">
									<label className="block text-xs font-medium text-zinc-500">
										{t("start_date")}
									</label>
									<Tooltip text={t("tooltip_start_date")} />
								</div>
								<input
									type="date"
									required
									value={bill.start_date}
									// Only new bills must start in the current month or
									// later; an existing bill's original start date stays
									// selectable when editing.
									min={isEdit ? undefined : CURRENT_MONTH_START}
									onChange={(e) =>
										setBill({ ...bill, start_date: e.target.value })
									}
									className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								/>
							</div>
							<div>
								<div className="flex items-center gap-1 mb-1">
									<label className="block text-xs font-medium text-zinc-500">
										{t("duration_months")}
									</label>
									<Tooltip text={t("tooltip_duration")} align="right" />
								</div>
								<input
									type="number"
									min="1"
									value={bill.duration_months}
									onChange={(e) =>
										setBill({ ...bill, duration_months: e.target.value })
									}
									className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
									placeholder={t("optional")}
								/>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-1 mb-1">
								<label className="block text-xs font-medium text-zinc-500">
									{t("category")}
								</label>
								<Tooltip text={t("tooltip_category")} />
							</div>
							<select
								required
								value={bill.category}
								onChange={(e) => setBill({ ...bill, category: e.target.value })}
								className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white text-sm text-zinc-900"
							>
								<option value="" disabled>
									{t("select_category")}
								</option>
								{CATEGORY_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{t(opt.label)}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-zinc-500 mb-1">
								{t("notes")}
							</label>
							<input
								type="text"
								value={bill.notes}
								onChange={(e) => setBill({ ...bill, notes: e.target.value })}
								className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								placeholder={
									t("notes_placeholder") ?? "e.g. paid via Maybank (optional)"
								}
							/>
						</div>
					</form>
				</div>

				<div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
					>
						{t("cancel")}
					</button>
					<button
						type="submit"
						form={formId}
						disabled={isSaving}
						className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{isSaving ? t("saving") : t("save_bill")}
					</button>
				</div>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
