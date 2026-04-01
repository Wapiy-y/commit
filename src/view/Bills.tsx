import type { TFunction } from "i18next";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AddBillModal } from "@/components/AddBillModal";
import { BillCard } from "@/components/BillCard";
import { BillsSkeleton } from "@/components/BillsSkeleton";
import { FilterBar, type PaidFilter } from "@/components/FilterBar";
import { PaymentConfirmModal } from "@/components/PaymentConfirmModal";
import type { Bill, NewBill } from "@/type";

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

	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");

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
			{showAddModal && (
				<AddBillModal
					onClose={() => setShowAddModal(false)}
					onSubmit={onAddBill}
					t={t}
				/>
			)}

			{confirmPayment && (
				<PaymentConfirmModal
					confirmPayment={confirmPayment}
					confirmError={confirmError}
					isConfirming={isConfirming}
					onConfirm={handleModalConfirm}
					onCancel={handleModalCancel}
					t={t}
				/>
			)}

			<button
				onClick={() => setShowAddModal(true)}
				disabled={!isCurrentMonth}
				className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<Plus size={18} />
				{t("add_new_bill")}
			</button>

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

			{error && (
				<div className="text-center py-4 text-red-500 text-sm">{error}</div>
			)}

			<div className="space-y-3">
				{loading ? (
					<BillsSkeleton />
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
							<BillCard
								key={bill.id}
								bill={bill}
								displayValue={displayValue}
								isDirty={isDirty}
								onDelete={onDeleteBill}
								onDraftChange={handleDraftChange}
								onConfirmClick={handleConfirmClick}
								t={t}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}
