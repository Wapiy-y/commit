import { format } from "date-fns";
import type { TFunction } from "i18next";
import {
	AlertTriangle,
	HelpCircle,
	Plus,
	SlidersHorizontal,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Bill, NewBill } from "@/type";
import { CategoryList } from "@/type";

interface BillsProps {
	bills: Bill[];
	loading: boolean;
	error: string | null;
	isCurrentMonth: boolean;
	onAddBill: (bill: NewBill) => Promise<void>;
	onDeleteBill: (id: number) => Promise<void>;
	onUpdatePayment: (bill: Bill, amount: string) => Promise<void>;
	t: TFunction;
}

interface PaymentConfirmState {
	bill: Bill;
	amount: string;
}

const CATEGORY_OPTIONS = [
	{ value: CategoryList.WATER, label: "category_water" },
	{ value: CategoryList.ELECTRIC, label: "category_electric" },
	{ value: CategoryList.INTERNET, label: "category_internet" },
	{ value: CategoryList.PHONE, label: "category_phone" },
	{ value: CategoryList.RENT, label: "category_rent" },
	{ value: CategoryList.MAINTENANCE, label: "category_maintenance" },
	{ value: CategoryList.LOAN, label: "category_loan" },
	{ value: CategoryList.CREDIT_CARD, label: "category_credit_card" },
	{ value: CategoryList.INSURANCE, label: "category_insurance" },
	{ value: CategoryList.INVESTMENT, label: "category_investment" },
	{ value: CategoryList.INSTALLMENT, label: "category_installment" },
	{ value: CategoryList.STREAMING, label: "category_streaming" },
	{ value: CategoryList.SOFTWARE, label: "category_software" },
	{ value: CategoryList.GROCERY, label: "category_grocery" },
	{ value: CategoryList.TRANSPORT, label: "category_transport" },
	{ value: CategoryList.FUEL, label: "category_fuel" },
	{ value: CategoryList.PARKING, label: "category_parking" },
	{ value: CategoryList.OTHER, label: "category_other" },
];

type PaidFilter = "all" | "paid" | "unpaid";

const EMPTY_NEW_BILL: NewBill = {
	name: "",
	amount: "",
	due_day: "",
	start_date: format(new Date(), "yyyy-MM-dd"),
	duration_months: "",
	category: "",
	notes: "",
};

// ---------------------------------------------------------------------------
// Add Bill Modal
// ---------------------------------------------------------------------------
interface AddBillModalProps {
	onClose: () => void;
	onSubmit: (bill: NewBill) => Promise<void>;
	t: TFunction;
}

function AddBillModal({ onClose, onSubmit, t }: AddBillModalProps) {
	const [newBill, setNewBill] = useState<NewBill>(EMPTY_NEW_BILL);
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await onSubmit(newBill);
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	const modal = (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Sheet / Dialog */}
			<div
				className={cn(
					"relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl",
					"animate-in slide-in-from-bottom sm:zoom-in-95 duration-200",
					"max-h-[90dvh] flex flex-col",
				)}
			>
				{/* Handle (mobile only) */}
				<div className="flex justify-center pt-3 pb-1 sm:hidden">
					<div className="w-10 h-1 rounded-full bg-zinc-200" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
					<h2 className="text-base font-semibold text-zinc-900">
						{t("add_new_bill")}
					</h2>
					<button
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				{/* Scrollable form body */}
				<div className="overflow-y-auto flex-1 px-5 py-4">
					<form
						onSubmit={handleSubmit}
						id="add-bill-form"
						className="space-y-4"
					>
						{/* Bill Name */}
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
								value={newBill.name}
								onChange={(e) =>
									setNewBill({ ...newBill, name: e.target.value })
								}
								className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								placeholder={t("example_netflix")}
							/>
						</div>

						{/* Amount + Due Day */}
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
									value={newBill.amount}
									onChange={(e) =>
										setNewBill({ ...newBill, amount: e.target.value })
									}
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
									value={newBill.due_day}
									onChange={(e) =>
										setNewBill({ ...newBill, due_day: e.target.value })
									}
									className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								/>
							</div>
						</div>

						{/* Start Date + Duration */}
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
									value={newBill.start_date}
									min={format(
										new Date(
											new Date().getFullYear(),
											new Date().getMonth(),
											1,
										),
										"yyyy-MM-dd",
									)}
									onChange={(e) =>
										setNewBill({ ...newBill, start_date: e.target.value })
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
									value={newBill.duration_months}
									onChange={(e) =>
										setNewBill({ ...newBill, duration_months: e.target.value })
									}
									className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
									placeholder={t("optional")}
								/>
							</div>
						</div>

						{/* Category */}
						<div>
							<div className="flex items-center gap-1 mb-1">
								<label className="block text-xs font-medium text-zinc-500">
									{t("category")}
								</label>
								<Tooltip text={t("tooltip_category")} />
							</div>
							<select
								required
								value={newBill.category}
								onChange={(e) =>
									setNewBill({ ...newBill, category: e.target.value })
								}
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

						{/* Notes */}
						<div>
							<label className="block text-xs font-medium text-zinc-500 mb-1">
								{t("notes")}
							</label>
							<input
								type="text"
								value={newBill.notes}
								onChange={(e) =>
									setNewBill({ ...newBill, notes: e.target.value })
								}
								className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
								placeholder={
									t("notes_placeholder") ?? "e.g. paid via Maybank (optional)"
								}
							/>
						</div>
					</form>
				</div>

				{/* Footer — sticky at bottom */}
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
						form="add-bill-form"
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

// ---------------------------------------------------------------------------
// Small reusable tooltip
// ---------------------------------------------------------------------------
function Tooltip({
	text,
	align = "center",
}: {
	text: string;
	align?: "center" | "right";
}) {
	return (
		<div className="group relative">
			<HelpCircle size={12} className="text-zinc-400 cursor-help" />
			<div
				className={cn(
					"absolute bottom-full mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded",
					"opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10",
					align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
				)}
			>
				{text}
				<div
					className={cn(
						"absolute top-full border-4 border-transparent border-t-zinc-800",
						align === "right" ? "right-1" : "left-1/2 -translate-x-1/2",
					)}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------
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

function FilterBar({
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
			{/* Toggle row */}
			<button
				onClick={() => setExpanded((v) => !v)}
				className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors  border border-zinc-200 shadow-sm"
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

			{/* Expanded filters */}
			{expanded && (
				<div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-3 animate-in slide-in-from-top-1 duration-150">
					{/* Paid status pills */}
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

					{/* Category chips */}
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

					{/* Clear */}
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

// ---------------------------------------------------------------------------
// Main Bills component
// ---------------------------------------------------------------------------
export default function Bills({
	bills,
	loading,
	error,
	isCurrentMonth,
	onAddBill,
	onDeleteBill,
	onUpdatePayment,
	t,
}: BillsProps) {
	const [showAddModal, setShowAddModal] = useState(false);
	const [draftAmounts, setDraftAmounts] = useState<Record<number, string>>({});
	const [confirmPayment, setConfirmPayment] =
		useState<PaymentConfirmState | null>(null);
	const [confirmError, setConfirmError] = useState<string | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);

	// Filter state
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");

	// Derived: filtered bills
	const filteredBills = useMemo(() => {
		return bills.filter((bill) => {
			const matchesPaid =
				paidFilter === "all" ||
				(paidFilter === "paid" && bill.is_paid) ||
				(paidFilter === "unpaid" && !bill.is_paid);
			const matchesCategory =
				selectedCategories.length === 0 ||
				selectedCategories.includes(bill.category);
			return matchesPaid && matchesCategory;
		});
	}, [bills, paidFilter, selectedCategories]);

	const handleToggleCategory = (cat: string) => {
		setSelectedCategories((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		);
	};

	const handleClearFilters = () => {
		setSelectedCategories([]);
		setPaidFilter("all");
	};

	const handleDraftChange = (billId: number, value: string) => {
		setDraftAmounts((prev) => ({ ...prev, [billId]: value }));
	};

	const handleConfirmClick = (bill: Bill) => {
		const draft = draftAmounts[bill.id] ?? "";
		const parsed = parseFloat(draft);
		if (!draft || Number.isNaN(parsed) || parsed <= 0) {
			setConfirmError(t("amount_min_1"));
			setConfirmPayment({ bill, amount: draft });
			return;
		}
		setConfirmError(null);
		setConfirmPayment({ bill, amount: draft });
	};

	const handleModalConfirm = async () => {
		if (!confirmPayment) return;
		const parsed = parseFloat(confirmPayment.amount);
		if (Number.isNaN(parsed) || parsed <= 0) {
			setConfirmError(t("amount_min_1"));
			return;
		}
		setIsConfirming(true);
		try {
			await onUpdatePayment(confirmPayment.bill, confirmPayment.amount);
			setDraftAmounts((prev) => {
				const next = { ...prev };
				delete next[confirmPayment.bill.id];
				return next;
			});
			setConfirmPayment(null);
			setConfirmError(null);
		} finally {
			setIsConfirming(false);
		}
	};

	const handleModalCancel = () => {
		setConfirmPayment(null);
		setConfirmError(null);
	};

	return (
		<div className="space-y-4">
			{/* ── Add Bill Modal ─────────────────────────────────────────── */}
			{showAddModal && (
				<AddBillModal
					onClose={() => setShowAddModal(false)}
					onSubmit={onAddBill}
					t={t}
				/>
			)}

			{/* ── Payment Confirm Modal ──────────────────────────────────── */}
			{confirmPayment && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40"
						onClick={handleModalCancel}
					/>
					<div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95">
						<div className="space-y-1">
							<h2 className="text-base font-semibold text-zinc-900">
								{t("confirm_payment")}
							</h2>
							<p className="text-sm text-zinc-500">
								{confirmPayment.bill.name}
							</p>
						</div>

						{parseFloat(confirmPayment.amount) >
							parseFloat(confirmPayment.bill.amount) && (
							<div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
								<AlertTriangle
									size={15}
									className="text-amber-500 mt-0.5 shrink-0"
								/>
								<p className="text-xs text-amber-700">
									{t("warning_over_amount")}
								</p>
							</div>
						)}

						{confirmError && (
							<div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
								<AlertTriangle
									size={15}
									className="text-red-500 mt-0.5 shrink-0"
								/>
								<p className="text-xs text-red-700">{confirmError}</p>
							</div>
						)}

						<div className="bg-zinc-50 rounded-xl px-4 py-3 flex justify-between items-center">
							<span className="text-sm text-zinc-500">
								{t("amount_to_pay")}
							</span>
							<span className="text-lg font-semibold text-zinc-900">
								RM {parseFloat(confirmPayment.amount || "0").toFixed(2)}
							</span>
						</div>

						<div className="flex gap-3 pt-1">
							<button
								onClick={handleModalCancel}
								className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
							>
								{t("cancel")}
							</button>
							<button
								onClick={handleModalConfirm}
								disabled={!!confirmError || isConfirming}
								className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{isConfirming ? t("saving") : t("confirm")}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Add Bill Button ────────────────────────────────────────── */}
			<button
				onClick={() => setShowAddModal(true)}
				disabled={!isCurrentMonth}
				className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<Plus size={18} />
				{t("add_new_bill")}
			</button>

			{/* ── Filter Bar ────────────────────────────────────────────── */}
			{!loading && bills.length > 0 && (
				<FilterBar
					selectedCategories={selectedCategories}
					paidFilter={paidFilter}
					onToggleCategory={handleToggleCategory}
					onSetPaidFilter={setPaidFilter}
					onClearAll={handleClearFilters}
					t={t}
					totalCount={bills.length}
					filteredCount={filteredBills.length}
				/>
			)}

			{/* ── Error ─────────────────────────────────────────────────── */}
			{error && (
				<div className="text-center py-4 text-red-500 text-sm">{error}</div>
			)}

			{/* ── Bill List ─────────────────────────────────────────────── */}
			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-8 text-zinc-400">
						{t("loading_bills")}
					</div>
				) : filteredBills.length === 0 ? (
					<div className="text-center py-8 text-zinc-400">
						{bills.length > 0
							? t("no_bills_match_filter")
							: t("no_bills_found")}
					</div>
				) : (
					filteredBills.map((bill) => {
						const isPaid = bill.is_paid;
						const displayValue = isPaid
							? String(bill.paid_amount ?? "")
							: (draftAmounts[bill.id] ?? "");
						const draft = draftAmounts[bill.id] ?? "";
						const isDirty = !isPaid && draft !== "" && parseFloat(draft) > 0;

						return (
							<div
								key={bill.id}
								className={cn(
									"bg-white p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3",
									isPaid
										? "border-emerald-100 bg-emerald-50/30"
										: "border-zinc-100",
								)}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<h3
												className={cn(
													"font-medium",
													isPaid && "text-emerald-900",
												)}
											>
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
															CATEGORY_OPTIONS.find(
																(o) => o.value === bill.category,
															)?.label ?? bill.category,
														)}
													</span>
												</>
											)}
										</div>
										{bill.notes && (
											<p className="text-xs text-zinc-400 mt-1 italic">
												{bill.notes}
											</p>
										)}
									</div>
									<button
										onClick={() => onDeleteBill(bill.id)}
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
												onChange={(e) =>
													handleDraftChange(bill.id, e.target.value)
												}
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
												onClick={() => handleDraftChange(bill.id, bill.amount)}
												className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap"
											>
												{t("full")}
											</button>
										)}
									</div>

									{isDirty && (
										<button
											onClick={() => handleConfirmClick(bill)}
											className="w-full py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors animate-in fade-in slide-in-from-bottom-1"
										>
											{t("confirm_payment")}
										</button>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
