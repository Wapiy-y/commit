import type { TFunction } from "i18next";
import { Pencil, Trash2 } from "lucide-react";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Bill } from "@/type";

interface BillCardProps {
	bill: Bill;
	displayValue: string;
	isDirty: boolean;
	onDelete: (id: number) => void;
	onEdit: (bill: Bill) => void;
	onDraftChange: (id: number, value: string) => void;
	onConfirmClick: (bill: Bill) => void;
	t: TFunction;
}

export function BillCard({
	bill,
	displayValue,
	isDirty,
	onDelete,
	onEdit,
	onDraftChange,
	onConfirmClick,
	t,
}: BillCardProps) {
	const isPaid = bill.is_paid;

	return (
		<div
			className={cn(
				"bg-white dark:bg-zinc-900 p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-3",
				isPaid
					? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-200 dark:ring-emerald-900"
					: "border-zinc-100 dark:border-zinc-800",
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<h3
							className={cn(
								"font-medium",
								isPaid && "text-emerald-900 dark:text-emerald-100",
							)}
						>
							{bill.name}
						</h3>
						{isPaid && (
							<span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
								{t("paid_status")}
							</span>
						)}
					</div>
					<div
						className={cn(
							"text-sm flex items-center gap-3 flex-wrap",
							isPaid
								? "text-emerald-800 dark:text-emerald-200"
								: "text-zinc-500 dark:text-zinc-400",
						)}
					>
						<span className={cn(isPaid && "font-semibold")}>
							RM {parseFloat(bill.amount).toFixed(2)}
						</span>
						<span
							className={cn(
								"w-1 h-1 rounded-full",
								isPaid ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600",
							)}
						/>
						<span>
							{t("day")} {bill.due_day}
						</span>
						{bill.category && (
							<>
								<span
									className={cn(
										"w-1 h-1 rounded-full",
										isPaid ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600",
									)}
								/>
								<span className="capitalize">
									{t(
										CATEGORY_OPTIONS.find((o) => o.value === bill.category)
											?.label ?? bill.category,
									)}
								</span>
							</>
						)}
					</div>
					{bill.notes && (
						<p
							className={cn(
								"text-xs mt-1 italic",
								isPaid
									? "text-emerald-700 dark:text-emerald-300"
									: "text-zinc-400 dark:text-zinc-500",
							)}
						>
							{bill.notes}
						</p>
					)}
				</div>
				<div className="flex items-center gap-1">
					<button
						onClick={() => onEdit(bill)}
						title={t("edit_bill")}
						className={cn(
							"w-8 h-8 flex items-center justify-center transition-colors",
							isPaid
								? "text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400"
								: "text-zinc-300 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200",
						)}
					>
						<Pencil size={16} />
					</button>
					<button
						onClick={() => onDelete(bill.id)}
						className="w-8 h-8 flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors"
					>
						<Trash2 size={16} />
					</button>
				</div>
			</div>

			<div
				className={cn(
					"flex flex-col gap-2 pt-2 border-t",
					isPaid
						? "border-emerald-200 dark:border-emerald-800"
						: "border-zinc-100/50 dark:border-zinc-800/50",
				)}
			>
				<div className="flex items-center gap-3">
					<label
						className={cn(
							"text-xs font-medium whitespace-nowrap",
							isPaid
								? "text-emerald-700 dark:text-emerald-300"
								: "text-zinc-500 dark:text-zinc-400",
						)}
					>
						{t("paid_amount")}:
					</label>
					<div className="relative flex-1">
						<span
							className={cn(
								"absolute left-3 top-1/2 -translate-y-1/2 text-sm",
								isPaid
									? "text-emerald-500 dark:text-emerald-400"
									: "text-zinc-400 dark:text-zinc-500",
							)}
						>
							RM
						</span>
						<input
							type="number"
							step="0.01"
							value={displayValue}
							disabled={isPaid}
							onChange={(e) => onDraftChange(bill.id, e.target.value)}
							placeholder="0.00"
							className={cn(
								"w-full pl-9 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all",
								isPaid
									? "border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 font-semibold text-emerald-900 dark:text-emerald-100 opacity-80 cursor-not-allowed"
									: "border-zinc-200 dark:border-zinc-800 focus:ring-zinc-900/10 bg-zinc-50/50 dark:bg-zinc-800/50",
							)}
						/>
					</div>
					{!isPaid && (
						<button
							onClick={() => onDraftChange(bill.id, bill.amount)}
							className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md transition-colors whitespace-nowrap"
						>
							{t("full")}
						</button>
					)}
				</div>

				{isDirty && (
					<button
						onClick={() => onConfirmClick(bill)}
						className="w-full py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors animate-in fade-in slide-in-from-bottom-1"
					>
						{t("confirm_payment")}
					</button>
				)}
			</div>
		</div>
	);
}
