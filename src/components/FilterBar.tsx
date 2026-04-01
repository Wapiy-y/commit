import type { TFunction } from "i18next";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";

export type PaidFilter = "all" | "paid" | "unpaid";

interface FilterBarProps {
	selectedCategories: string[];
	paidFilter: PaidFilter;
	onToggleCategory: (cat: string) => void;
	onSetPaidFilter: (f: PaidFilter) => void;
	onClearAll: () => void;
	t: TFunction;
	totalCount: number;
	filteredCount: number;
}

export function FilterBar({
	selectedCategories,
	paidFilter,
	onToggleCategory,
	onSetPaidFilter,
	onClearAll,
	t,
	totalCount,
	filteredCount,
}: FilterBarProps) {
	const [expanded, setExpanded] = useState(false);
	const hasActiveFilters =
		selectedCategories.length > 0 || paidFilter !== "all";
	const activeCount =
		selectedCategories.length + (paidFilter !== "all" ? 1 : 0);

	return (
		<div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
			<button
				onClick={() => setExpanded((v) => !v)}
				className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors border border-zinc-200 shadow-sm"
			>
				<div className="flex items-center gap-2">
					<SlidersHorizontal size={15} className="text-zinc-400" />
					<span>{t("filter")}</span>
					{hasActiveFilters && (
						<span className="bg-zinc-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
							{activeCount}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{hasActiveFilters && (
						<span className="text-xs text-zinc-400">
							{filteredCount}/{totalCount}
						</span>
					)}
					<span
						className={cn(
							"text-zinc-400 transition-transform duration-200",
							expanded && "rotate-180",
						)}
					>
						▾
					</span>
				</div>
			</button>

			{expanded && (
				<div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-3 animate-in slide-in-from-top-1 duration-150">
					<div>
						<p className="text-[10px] font-semibold text-zinc-400 tracking-wide mb-2">
							{t("status")}
						</p>
						<div className="flex gap-2 flex-wrap">
							{(["all", "paid", "unpaid"] as PaidFilter[]).map((f) => (
								<button
									key={f}
									onClick={() => onSetPaidFilter(f)}
									className={cn(
										"px-3 py-1 rounded-full text-xs font-medium border transition-all",
										paidFilter === f
											? "bg-zinc-900 text-white border-zinc-900"
											: "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400",
									)}
								>
									{t(`filter_${f}`) ?? f.charAt(0).toUpperCase() + f.slice(1)}
								</button>
							))}
						</div>
					</div>

					<div>
						<p className="text-[10px] font-semibold text-zinc-400 tracking-wide mb-2">
							{t("category_filter")}
						</p>
						<div className="flex gap-1.5 flex-wrap">
							{CATEGORY_OPTIONS.map((opt) => {
								const active = selectedCategories.includes(opt.value);
								return (
									<button
										key={opt.value}
										onClick={() => onToggleCategory(opt.value)}
										className={cn(
											"px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
											active
												? "bg-emerald-600 text-white border-emerald-600"
												: "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400",
										)}
									>
										{t(opt.label)}
									</button>
								);
							})}
						</div>
					</div>

					{hasActiveFilters && (
						<button
							onClick={onClearAll}
							className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors"
						>
							{t("clear_filters")}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
