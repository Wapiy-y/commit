import type { TFunction } from "i18next";
import {
	ArrowLeftRight,
	Check,
	Pencil,
	Plus,
	ScrollText,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchActivity } from "@/api/activity";
import { cn } from "@/lib/utils";
import type { ActivityAction, ActivitySnapshot, BillActivity } from "@/type";

/** Months fetched per page. Also the threshold for showing "Load older". */
const PAGE_MONTHS = 6;

interface RecordProps {
	t: TFunction;
	/** i18next language ("en" | "my"), used to format month names. */
	language: string;
}

const money = (value: number | null | undefined) =>
	`RM ${(value ?? 0).toFixed(2)}`;

/** Net movement in money for one event: payments add, clears subtract. */
const paymentDelta = (event: BillActivity) => {
	if (event.action === "payment_recorded") return event.amount ?? 0;
	if (event.action === "payment_changed")
		return (event.amount ?? 0) - (event.prev_amount ?? 0);
	if (event.action === "payment_cleared") return -(event.prev_amount ?? 0);
	return 0;
};

const ACTION_STYLE: Record<
	ActivityAction,
	{ icon: typeof Check; tone: string }
> = {
	bill_created: {
		icon: Plus,
		tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
	},
	bill_updated: {
		icon: Pencil,
		tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
	},
	payment_recorded: {
		icon: Check,
		tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
	},
	payment_changed: {
		icon: ArrowLeftRight,
		tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
	},
	payment_cleared: {
		icon: X,
		tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
	},
	bill_deleted: {
		icon: Trash2,
		tone: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
	},
};

const DIFF_FIELDS = [
	"name",
	"amount",
	"due_day",
	"start_date",
	"duration_months",
	"category",
	"notes",
] as const;

export default function Record({ t, language }: RecordProps) {
	const [events, setEvents] = useState<BillActivity[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);

	const locale = language === "my" ? "ms-MY" : "en-MY";

	const load = useCallback(async (before?: string) => {
		const page = await fetchActivity({ months: PAGE_MONTHS, before });
		return {
			page,
			more: new Set(page.map((event) => event.month)).size === PAGE_MONTHS,
		};
	}, []);

	// Remounts whenever the Record tab is opened, so history is never stale
	// after a payment made on the Bill tab.
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		load()
			.then(({ page, more }) => {
				if (cancelled) return;
				setEvents(page);
				setHasMore(more);
			})
			.catch(() => {
				if (!cancelled) setError(t("record_failed"));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [load, t]);

	const loadOlder = async () => {
		const oldest = events.reduce<string | undefined>(
			(acc, event) =>
				acc === undefined || event.month < acc ? event.month : acc,
			undefined,
		);
		if (!oldest) return;
		setLoadingMore(true);
		try {
			const { page, more } = await load(oldest);
			setEvents((prev) => [...prev, ...page]);
			setHasMore(more);
		} catch {
			setError(t("record_failed"));
		} finally {
			setLoadingMore(false);
		}
	};

	const groups = useMemo(() => {
		const byMonth = new Map<string, BillActivity[]>();
		for (const event of events) {
			const bucket = byMonth.get(event.month) ?? [];
			bucket.push(event);
			byMonth.set(event.month, bucket);
		}
		return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
	}, [events]);

	const monthLabel = (month: string) => {
		const [year, monthIndex] = month.split("-").map(Number);
		return new Intl.DateTimeFormat(locale, {
			month: "long",
			year: "numeric",
		}).format(new Date(year, monthIndex - 1, 1));
	};

	const timeLabel = (iso: string) =>
		new Intl.DateTimeFormat(locale, {
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(iso));

	const fieldLabel = (field: string) => {
		if (field === "name") return t("field_name");
		if (field === "amount") return t("field_amount");
		if (field === "start_date") return t("field_start_date");
		const known = ["due_day", "duration_months", "category", "notes"];
		return known.includes(field) ? t(field) : field;
	};

	const renderValue = (value: unknown) => {
		if (value === null || value === undefined || value === "") return "—";
		return String(value);
	};

	/** Only fields that actually moved, so an edit reads as its real effect. */
	const diffOf = (event: BillActivity) => {
		const before = (event.changes?.before ?? {}) as ActivitySnapshot;
		const after = (event.changes?.after ?? {}) as ActivitySnapshot;
		return DIFF_FIELDS.filter(
			(field) => String(before[field] ?? "") !== String(after[field] ?? ""),
		).map((field) => ({
			field,
			from: renderValue(before[field]),
			to: renderValue(after[field]),
		}));
	};

	const titleOf = (event: BillActivity) => {
		switch (event.action) {
			case "payment_recorded":
				return t("action_payment_recorded", { amount: money(event.amount) });
			case "payment_changed":
				return t("action_payment_changed", {
					from: money(event.prev_amount),
					to: money(event.amount),
				});
			case "payment_cleared":
				return t("action_payment_cleared", {
					from: money(event.prev_amount),
				});
			case "bill_created":
				return t("action_bill_created", { amount: money(event.amount) });
			case "bill_updated":
				return t("action_bill_updated");
			default:
				return t("action_bill_deleted");
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center gap-3 py-16">
				<div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-800 dark:border-t-zinc-200 rounded-full animate-spin" />
				<p className="text-sm text-zinc-400 dark:text-zinc-500">
					{t("loading")}
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
			</div>
		);
	}

	if (groups.length === 0) {
		return (
			<div className="py-16 text-center space-y-3">
				<ScrollText
					size={28}
					className="mx-auto text-zinc-300 dark:text-zinc-700"
				/>
				<p className="text-sm text-zinc-400 dark:text-zinc-500">
					{t("record_empty")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5 animate-in fade-in duration-300">
			{groups.map(([month, monthEvents]) => {
				const netPaid = monthEvents.reduce(
					(sum, event) => sum + paymentDelta(event),
					0,
				);
				const touched = monthEvents.some((event) =>
					event.action.startsWith("payment"),
				);

				return (
					<section key={month} className="space-y-2">
						<div className="flex items-baseline justify-between px-1">
							<h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
								{monthLabel(month)}
							</h2>
							<span className="text-xs text-zinc-500 dark:text-zinc-400">
								{touched
									? t("record_paid_total", { amount: money(netPaid) })
									: t("record_event_count", {
											count: monthEvents.length,
										})}
							</span>
						</div>

						<ul className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
							{monthEvents.map((event) => {
								const style = ACTION_STYLE[event.action];
								const Icon = style.icon;
								const isDeleted = event.action === "bill_deleted";
								return (
									<li key={event.id} className="flex gap-3 px-4 py-3">
										<div
											className={cn(
												"mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
												style.tone,
											)}
										>
											<Icon size={14} />
										</div>
										<div className="min-w-0 flex-1 space-y-0.5">
											<p className="text-sm text-zinc-900 dark:text-zinc-50">
												{titleOf(event)}
											</p>
											<p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
												<span
													className={cn(
														isDeleted &&
															"line-through text-zinc-400 dark:text-zinc-500",
													)}
												>
													{event.bill_name}
												</span>
												{" · "}
												{timeLabel(event.created_at)}
												{event.month_year && event.action.startsWith("payment")
													? ` · ${event.month_year}`
													: ""}
											</p>
											{event.action === "bill_updated" &&
												diffOf(event).map((change) => (
													<p
														key={change.field}
														className="text-xs text-zinc-400 dark:text-zinc-500"
													>
														{fieldLabel(change.field)}: {change.from} →{" "}
														{change.to}
													</p>
												))}
										</div>
									</li>
								);
							})}
						</ul>
					</section>
				);
			})}

			{hasMore && (
				<div className="pt-1 pb-2">
					<button
						onClick={loadOlder}
						disabled={loadingMore}
						className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition-colors disabled:opacity-40"
					>
						{loadingMore ? t("saving") : t("record_load_older")}
					</button>
				</div>
			)}
		</div>
	);
}
