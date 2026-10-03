import type { TFunction } from "i18next";
import {
	AlertCircle,
	CheckCircle2,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { HomeSkeleton } from "@/components/HomeSkeleton";
import { StatCard } from "@/components/StatCard";
import { SummaryCard } from "@/components/SummerCard";
import type { BillSummary } from "@/type";

interface HomeProps {
	userName: string;
	summary: BillSummary | null;
	loading: boolean;
	t: TFunction;
}

export default function Home({ userName, summary, loading, t }: HomeProps) {
	if (loading || !summary) return <HomeSkeleton />;

	return (
		<div className="space-y-6">
			<p className="text-sm text-zinc-500 dark:text-zinc-400">
				{t("user_title")}, {userName} 👋
			</p>

			<SummaryCard
				totalCommitment={summary.total_commitment}
				totalPaid={summary.total_paid}
				totalUnpaid={summary.total_unpaid}
				trueTotalPaid={summary.true_total_paid}
				t={t}
			/>

			<div className="grid grid-cols-3 gap-3">
				<StatCard label={t("total_bill")} value={summary.total_bills} />
				<StatCard label={t("total_paid")} value={summary.paid_count} />
				<StatCard label={t("total_unpaid")} value={summary.unpaid_count} />
			</div>

			<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-50">
				<p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-4 pt-3 pb-2">
					{t("payment_breakdown")}
				</p>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
						<CheckCircle2
							size={16}
							className="text-emerald-500 dark:text-emerald-400"
						/>
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
							{t("paid_exact")}
						</p>
						<p className="text-xs text-zinc-400 dark:text-zinc-500">
							{summary.exact_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
						✓
					</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
						<TrendingDown size={16} className="text-blue-500" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
							{t("underpaid_bills")}
						</p>
						<p className="text-xs text-zinc-400 dark:text-zinc-500">
							{summary.underpaid_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
						-RM {summary.total_shortfall.toFixed(2)}
					</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
						<TrendingUp
							size={16}
							className="text-amber-500 dark:text-amber-400"
						/>
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
							{t("overpaid_bills")}
						</p>
						<p className="text-xs text-zinc-400 dark:text-zinc-500">
							{summary.overpaid_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-amber-600">
						+RM {summary.total_excess.toFixed(2)}
					</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center shrink-0">
						<AlertCircle size={16} className="text-red-400" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
							{t("not_paid_yet")}
						</p>
						<p className="text-xs text-zinc-400 dark:text-zinc-500">
							{summary.unpaid_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-red-500 dark:text-red-400">
						{summary.unpaid_count}
					</span>
				</div>
			</div>
		</div>
	);
}
