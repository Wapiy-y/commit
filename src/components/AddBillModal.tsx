import type { TFunction } from "i18next";
import type { NewBill } from "@/type";
import { BillFormModal } from "./BillFormModal";

interface AddBillModalProps {
	onClose: () => void;
	onSubmit: (bill: NewBill) => Promise<void>;
	t: TFunction;
}

export function AddBillModal({ onClose, onSubmit, t }: AddBillModalProps) {
	return (
		<BillFormModal mode="create" onClose={onClose} onSubmit={onSubmit} t={t} />
	);
}
