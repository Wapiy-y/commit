import type { TFunction } from "i18next";
import { Eye, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";

interface SummaryCardProps {
	totalCommitment: number;
	totalPaid: number;
	totalUnpaid: number;
	trueTotalPaid: number;
	t: TFunction;
}

/** localStorage key for the privacy toggle. */
const HIDDEN_KEY = "bilku:hide-amounts";

/** Masks a figure. Same width regardless of value, so nothing leaks. */
const MASK = "••••••";

function readInitialHidden(): boolean {
	try {
		return localStorage.getItem(HIDDEN_KEY) === "1";
	} catch {
		// Private mode or storage disabled: start visible rather than crash.
		return false;
	}
}

/**
 * The home summary. Amounts can be masked with the eye toggle, which is
 * remembered in localStorage so it survives reloads and reopening the PWA.
 *
 * Only this card is masked; the payment breakdown below intentionally keeps its
 * figures visible.
 */
export function SummaryCard({
	totalCommitment,
	totalPaid,
	totalUnpaid,
	trueTotalPaid,
	t,
}: SummaryCardProps) {
	const [amountsHidden, setAmountsHidden] = useState(readInitialHidden);

	const toggleHidden = useCallback(() => {
		setAmountsHidden((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
			} catch {
				// Persisting is best-effort; the toggle still works this session.
			}
			return next;
		});
	}, []);

	/** Formats a figure, or masks it when hidden. */
	const amount = (value: number) =>
		amountsHidden ? MASK : `RM ${value.toFixed(2)}`;

	return (
		<div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
			<div className="flex items-start justify-between mb-1">
				<h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
					{t("total_commitment")}
				</h2>
				<button
					type="button"
					onClick={toggleHidden}
					aria-pressed={amountsHidden}
					aria-label={t("toggle_amount_visibility")}
					title={t("toggle_amount_visibility")}
					className="-mt-1 -mr-1 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
				>
					{amountsHidden ? <EyeOff size={18} /> : <Eye size={18} />}
				</button>
			</div>
			<div className="text-3xl font-bold tracking-tight mb-6">
				{amount(totalCommitment)}
			</div>
			<div className="space-y-4">
				<div className="flex justify-between text-sm">
					<span className="text-zinc-500 dark:text-zinc-400">{t("paid")}</span>
					<span className="font-medium text-zinc-900 dark:text-zinc-50">
						{amount(totalPaid)}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-zinc-500 dark:text-zinc-400">
						{t("remaining")}
					</span>
					<span className="font-medium text-zinc-900 dark:text-zinc-50">
						{amount(Math.max(totalUnpaid, 0))}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-zinc-500 dark:text-zinc-400">
						{t("true_paid")}
					</span>
					<span className="font-medium text-emerald-600 dark:text-emerald-400">
						{amount(trueTotalPaid)}
					</span>
				</div>
			</div>
		</div>
	);
}
