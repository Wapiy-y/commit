import type { TFunction } from "i18next";
import { AlertTriangle } from "lucide-react";
import type { Bill } from "@/type";

interface PaymentConfirmState {
	bill: Bill;
	amount: string;
}

interface PaymentConfirmModalProps {
	confirmPayment: PaymentConfirmState;
	confirmError: string | null;
	isConfirming: boolean;
	onConfirm: () => void;
	onCancel: () => void;
	t: TFunction;
}

export function PaymentConfirmModal({
	confirmPayment,
	confirmError,
	isConfirming,
	onConfirm,
	onCancel,
	t,
}: PaymentConfirmModalProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40" onClick={onCancel} />
			<div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95">
				<div className="space-y-1">
					<h2 className="text-base font-semibold text-zinc-900">
						{t("confirm_payment")}
					</h2>
					<p className="text-sm text-zinc-500">{confirmPayment.bill.name}</p>
				</div>

				{parseFloat(confirmPayment.amount) >
					parseFloat(confirmPayment.bill.amount) && (
					<div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
						<AlertTriangle
							size={15}
							className="text-amber-500 mt-0.5 shrink-0"
						/>
						<p className="text-xs text-amber-700">{t("warning_over_amount")}</p>
					</div>
				)}

				{confirmError && (
					<div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
						<AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
						<p className="text-xs text-red-700">{confirmError}</p>
					</div>
				)}

				<div className="bg-zinc-50 rounded-xl px-4 py-3 flex justify-between items-center">
					<span className="text-sm text-zinc-500">{t("amount_to_pay")}</span>
					<span className="text-lg font-semibold text-zinc-900">
						RM {parseFloat(confirmPayment.amount || "0").toFixed(2)}
					</span>
				</div>

				<div className="flex gap-3 pt-1">
					<button
						onClick={onCancel}
						className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
					>
						{t("cancel")}
					</button>
					<button
						onClick={onConfirm}
						disabled={!!confirmError || isConfirming}
						className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{isConfirming ? t("saving") : t("confirm")}
					</button>
				</div>
			</div>
		</div>
	);
}
