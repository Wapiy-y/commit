import type { TFunction } from "i18next";
import { Trash2 } from "lucide-react";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Bill } from "@/type";

interface BillCardProps {
	bill: Bill;
	displayValue: string;
	isDirty: boolean;
	onDelete: (id: number) => void;
	onDraftChange: (id: number, value: string) => void;
	onConfirmClick: (bill: Bill) => void;
	t: TFunction;
}

export function BillCard({
	bill,
	displayValue,
	isDirty,
	onDelete,
	onDraftChange,
	onConfirmClick,
	t,
}: BillCardProps) {
	const isPaid = bill.is_paid;

	return (
		<div
			className={cn(
				"bg-white p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3",
				isPaid ? "border-emerald-100 bg-emerald-50/30" : "border-zinc-100",
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<h3 className={cn("font-medium", isPaid && "text-emerald-900")}>
							{bill.name}
						</h3>
						{isPaid && (
							<span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
								{t("paid_status")}
							</span>
						)}
					</div>
					<div className="text-sm text-zinc-500 flex items-center gap-3 flex-wrap">
						<span>RM {parseFloat(bill.amount).toFixed(2)}</span>
						<span className="w-1 h-1 bg-zinc-300 rounded-full" />
						<span>
							{t("day")} {bill.due_day}
						</span>
						{bill.category && (
							<>
								<span className="w-1 h-1 bg-zinc-300 rounded-full" />
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
						<p className="text-xs text-zinc-400 mt-1 italic">{bill.notes}</p>
					)}
				</div>
				<button
					onClick={() => onDelete(bill.id)}
					className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors"
				>
					<Trash2 size={16} />
				</button>
			</div>

			<div className="flex flex-col gap-2 pt-2 border-t border-zinc-100/50">
				<div className="flex items-center gap-3">
					<label className="text-xs font-medium text-zinc-500 whitespace-nowrap">
						{t("paid_amount")}:
					</label>
					<div className="relative flex-1">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
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
									? "border-emerald-200 bg-emerald-50/50 text-emerald-900 opacity-70 cursor-not-allowed"
									: "border-zinc-200 focus:ring-zinc-900/10 bg-zinc-50/50",
							)}
						/>
					</div>
					{!isPaid && (
						<button
							onClick={() => onDraftChange(bill.id, bill.amount)}
							className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap"
						>
							{t("full")}
						</button>
					)}
				</div>

				{isDirty && (
					<button
						onClick={() => onConfirmClick(bill)}
						className="w-full py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors animate-in fade-in slide-in-from-bottom-1"
					>
						{t("confirm_payment")}
					</button>
				)}
			</div>
		</div>
	);
}
