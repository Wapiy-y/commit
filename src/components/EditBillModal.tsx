import type { TFunction } from "i18next";
import type { Bill, NewBill } from "@/type";
import { BillFormModal } from "./BillFormModal";

interface EditBillModalProps {
	bill: Bill;
	onClose: () => void;
	onSubmit: (bill: NewBill) => Promise<void>;
	t: TFunction;
}

/** Maps a stored bill onto the form's string-based shape. */
export function billToFormValues(bill: Bill): NewBill {
	return {
		name: bill.name,
		amount: bill.amount,
		due_day: String(bill.due_day),
		start_date: bill.start_date.slice(0, 10),
		duration_months:
			bill.duration_months === null ? "" : String(bill.duration_months),
		category: bill.category,
		notes: bill.notes ?? "",
	};
}

export function EditBillModal({
	bill,
	onClose,
	onSubmit,
	t,
}: EditBillModalProps) {
	return (
		<BillFormModal
			mode="edit"
			initialValues={billToFormValues(bill)}
			onClose={onClose}
			onSubmit={onSubmit}
			t={t}
		/>
	);
}
