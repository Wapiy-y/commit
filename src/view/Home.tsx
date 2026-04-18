import type { TFunction } from "i18next";
import {
	AlertCircle,
	CheckCircle2,
	Sparkles,
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
	aiInsight: string | null;
	aiLoading: boolean;
	onAiInsight: () => void;
	t: TFunction;
}

export default function Home({
	userName,
	summary,
	loading,
	aiInsight,
	aiLoading,
	onAiInsight,
	t,
}: HomeProps) {
	if (loading || !summary) return <HomeSkeleton />;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<p className="text-sm text-zinc-500">
					{t("user_title")}, {userName} 👋
				</p>
				<button
					type="button"
					onClick={onAiInsight}
					disabled={aiLoading}
					style={
						aiLoading
							? {
									backgroundImage:
										"linear-gradient(270deg, #10b981, #34d399, #059669, #6ee7b7)",
									backgroundSize: "300% 300%",
									animation: "gradient-shift 2s ease infinite",
								}
							: {
									backgroundImage:
										"linear-gradient(to right, #059669, #34d399)",
								}
					}
					className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-full active:scale-95 transition-transform"
				>
					<Sparkles size={12} />
					{aiLoading ? t("ai_loading") : t("ai_insight")}
				</button>
			</div>

			{aiInsight && (
				<div
					className="rounded-xl p-4 space-y-3 border border-emerald-800/40"
					style={{
						background:
							"linear-gradient(135deg, #0f1a15 0%, #111827 60%, #0a1628 100%)",
					}}
				>
					<div className="flex items-center gap-1.5">
						<Sparkles size={12} className="text-emerald-400" />
						<p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">
							{t("ai_insight")}
						</p>
					</div>
					{aiInsight
						.split("\n\n")
						.filter(Boolean)
						.map((paragraph) => (
							<p
								key={paragraph}
								className="text-sm text-zinc-200 leading-relaxed"
							>
								{paragraph}
							</p>
						))}
				</div>
			)}

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

			<div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
				<p className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 pt-3 pb-2">
					{t("payment_breakdown")}
				</p>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
						<CheckCircle2 size={16} className="text-emerald-500" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800">
							{t("paid_exact")}
						</p>
						<p className="text-xs text-zinc-400">
							{summary.exact_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-emerald-600">✓</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
						<TrendingDown size={16} className="text-blue-500" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800">
							{t("underpaid_bills")}
						</p>
						<p className="text-xs text-zinc-400">
							{summary.underpaid_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-blue-600">
						-RM {summary.total_shortfall.toFixed(2)}
					</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
						<TrendingUp size={16} className="text-amber-500" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800">
							{t("overpaid_bills")}
						</p>
						<p className="text-xs text-zinc-400">
							{summary.overpaid_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-amber-600">
						+RM {summary.total_excess.toFixed(2)}
					</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
						<AlertCircle size={16} className="text-red-400" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800">
							{t("not_paid_yet")}
						</p>
						<p className="text-xs text-zinc-400">
							{summary.unpaid_count} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-red-500">
						{summary.unpaid_count}
					</span>
				</div>
			</div>
		</div>
	);
}
