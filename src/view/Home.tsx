import type { TFunction } from "i18next";
import {
	AlertCircle,
	CheckCircle2,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { SummaryCard } from "@/components/SummerCard";
import type { Bill } from "@/type";

interface DashboardProps {
	userName: string;
	bills: Bill[];
	t: TFunction;
}

export default function Home({ userName, bills, t }: DashboardProps) {
	const totalCommitment = bills.reduce(
		(acc, bill) => acc + parseFloat(bill.amount),
		0,
	);
	const totalPaid = bills
		.filter((bill) => bill.is_paid === true)
		.reduce((acc, bill) => acc + parseFloat(bill.amount), 0);

	const totalUnpaid = bills
		.filter((bill) => bill.is_paid === false)
		.reduce((acc, bill) => acc + parseFloat(bill.amount), 0);

	const trueTotalPaid = bills
		.filter((bill) => bill.is_paid === true)
		.reduce((acc, bill) => acc + (bill.paid_amount || 0), 0);

	const paidCount = bills.filter((b) => b.is_paid).length;
	const unpaidCount = bills.length - paidCount;

	const exactBills = bills.filter(
		(b) => b.is_paid && (b.paid_amount || 0) === parseFloat(b.amount),
	);
	const underpaidBills = bills.filter(
		(b) => b.is_paid && (b.paid_amount || 0) < parseFloat(b.amount),
	);
	const overpaidBills = bills.filter(
		(b) => b.is_paid && (b.paid_amount || 0) > parseFloat(b.amount),
	);

	// Total shortfall across underpaid bills
	const totalShortfall = underpaidBills.reduce(
		(acc, b) => acc + (parseFloat(b.amount) - (b.paid_amount || 0)),
		0,
	);
	// Total excess across overpaid bills
	const totalExcess = overpaidBills.reduce(
		(acc, b) => acc + ((b.paid_amount || 0) - parseFloat(b.amount)),
		0,
	);

	return (
		<div className="space-y-6">
			<p className="text-sm text-zinc-500">
				{t("user_title")}, {userName} 👋
			</p>

			<SummaryCard
				totalCommitment={totalCommitment}
				totalPaid={totalPaid}
				totalUnpaid={totalUnpaid}
				trueTotalPaid={trueTotalPaid}
				t={t}
			/>

			<div className="grid grid-cols-3 gap-3">
				<StatCard label={t("total_bill")} value={bills.length} />
				<StatCard label={t("total_paid")} value={paidCount} />
				<StatCard label={t("total_unpaid")} value={unpaidCount} />
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
							{exactBills.length} {t("bills")}
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
							{t("underpaid_bills") ?? "Paid less than amount"}
						</p>
						<p className="text-xs text-zinc-400">
							{underpaidBills.length} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-blue-600">
						-RM {totalShortfall.toFixed(2)}
					</span>
				</div>

				<div className="flex items-center gap-3 px-4 py-3">
					<div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
						<TrendingUp size={16} className="text-amber-500" />
					</div>
					<div className="flex-1">
						<p className="text-sm font-medium text-zinc-800">
							{t("overpaid_bills") ?? "Paid over amount"}
						</p>
						<p className="text-xs text-zinc-400">
							{overpaidBills.length} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-amber-600">
						+RM {totalExcess.toFixed(2)}
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
							{unpaidCount} {t("bills")}
						</p>
					</div>
					<span className="text-sm font-semibold text-red-500">
						{unpaidCount}
					</span>
				</div>
			</div>
		</div>
	);
}
