import type { TFunction } from "i18next";

interface SummaryCardProps {
	totalCommitment: number;
	totalPaid: number;
	totalUnpaid: number;
	trueTotalPaid: number;
	t: TFunction;
}

export function SummaryCard({
	totalCommitment,
	totalPaid,
	totalUnpaid,
	trueTotalPaid,
	t,
}: SummaryCardProps) {
	return (
		<div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
			<h2 className="text-sm font-medium text-zinc-500 mb-1">
				{t("total_commitment")}
			</h2>
			<div className="text-3xl font-bold tracking-tight mb-6">
				RM {totalCommitment.toFixed(2)}
			</div>
			<div className="space-y-4">
				<div className="flex justify-between text-sm">
					<span className="text-zinc-500">{t("paid")}</span>
					<span className="font-medium text-zinc-900">
						RM {totalPaid.toFixed(2)}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-zinc-500">{t("remaining")}</span>
					<span className="font-medium text-zinc-900">
						RM {Math.max(totalUnpaid, 0).toFixed(2)}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-zinc-500">{t("true_paid")}</span>
					<span className="font-medium text-emerald-600">
						RM {trueTotalPaid.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	);
}
