import type { TFunction } from "i18next";
import type { NewBill } from "@/type";
import { BillFormModal } from "./BillFormModal";

interface AddBillModalProps {
	/** Prefilled start date; the viewed month when adding from a future month. */
	startDate?: string;
	onClose: () => void;
	onSubmit: (bill: NewBill) => Promise<void>;
	t: TFunction;
}

export function AddBillModal({
	startDate,
	onClose,
	onSubmit,
	t,
}: AddBillModalProps) {
	return (
		<BillFormModal
			mode="create"
			startDate={startDate}
			onClose={onClose}
			onSubmit={onSubmit}
			t={t}
		/>
	);
}
