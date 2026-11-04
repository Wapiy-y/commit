import { format } from "date-fns";
import type { TFunction } from "i18next";
import type React from "react";
import { useState } from "react";
import type { NewInsurance, VehicleInsurance } from "@/type";
import {
	FormActions,
	FormError,
	FormField,
	FormWarning,
	inputClass,
} from "./FormBits";
import { ModalShell } from "./ModalShell";

interface InsuranceFormModalProps {
	/** The policy being replaced; used for the coverage-gap warning. */
	current: VehicleInsurance | null;
	onClose: () => void;
	onSubmit: (policy: NewInsurance) => Promise<void>;
	t: TFunction;
}

const dayAfter = (date: string) => {
	const d = new Date(`${date}T00:00:00`);
	d.setDate(d.getDate() + 1);
	return format(d, "yyyy-MM-dd");
};

const yearAfter = (date: string) => {
	const d = new Date(`${date}T00:00:00`);
	d.setFullYear(d.getFullYear() + 1);
	d.setDate(d.getDate() - 1);
	return format(d, "yyyy-MM-dd");
};

export function InsuranceFormModal({
	current,
	onClose,
	onSubmit,
	t,
}: InsuranceFormModalProps) {
	const start = current
		? dayAfter(current.expiry_date)
		: format(new Date(), "yyyy-MM-dd");
	const [form, setForm] = useState<NewInsurance>({
		provider: current?.provider ?? "",
		policy_number: "",
		coverage_type: current?.coverage_type ?? "comprehensive",
		start_date: start,
		expiry_date: yearAfter(start),
		premium_paid: "",
	});
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// A renewal that starts after the old policy expired leaves an uninsured
	// window. Nobody notices that until a claim is rejected, so warn before saving.
	const gapDays =
		current && form.start_date > current.expiry_date
			? Math.round(
					(new Date(`${form.start_date}T00:00:00`).getTime() -
						new Date(`${current.expiry_date}T00:00:00`).getTime()) /
						(24 * 60 * 60 * 1000),
				)
			: 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSaving(true);
		try {
			await onSubmit(form);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<ModalShell
			title={current ? t("insurance_renew") : t("insurance_add")}
			subtitle={current ? t("insurance_renew_hint") : undefined}
			onClose={onClose}
			footer={
				<FormActions
					onCancel={onClose}
					submitLabel={t("insurance_save")}
					savingLabel={t("saving")}
					isSaving={isSaving}
					cancelLabel={t("cancel")}
				/>
			}
		>
			<form onSubmit={handleSubmit} id="insurance-form" className="space-y-4">
				<FormError message={error} />
				{gapDays > 0 && (
					<FormWarning
						message={t("insurance_gap_warning", { days: gapDays })}
					/>
				)}

				<FormField label={t("insurance_provider")}>
					<input
						required
						value={form.provider}
						onChange={(e) => setForm({ ...form, provider: e.target.value })}
						placeholder="Etiqa General Insurance"
						className={inputClass}
					/>
				</FormField>

				<div className="grid grid-cols-2 gap-3">
					<FormField label={t("insurance_policy")}>
						<input
							required
							value={form.policy_number}
							onChange={(e) =>
								setForm({ ...form, policy_number: e.target.value })
							}
							placeholder="P90-0021-99381"
							className={`${inputClass} font-mono`}
						/>
					</FormField>
					<FormField label={t("insurance_coverage")}>
						<select
							value={form.coverage_type}
							onChange={(e) =>
								setForm({
									...form,
									coverage_type: e.target
										.value as NewInsurance["coverage_type"],
								})
							}
							className={inputClass}
						>
							<option value="comprehensive">
								{t("coverage_comprehensive")}
							</option>
							<option value="third_party">{t("coverage_third_party")}</option>
						</select>
					</FormField>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<FormField label={t("insurance_start")}>
						<input
							type="date"
							required
							value={form.start_date}
							onChange={(e) => setForm({ ...form, start_date: e.target.value })}
							className={inputClass}
						/>
					</FormField>
					<FormField label={t("insurance_expiry")}>
						<input
							type="date"
							required
							value={form.expiry_date}
							onChange={(e) =>
								setForm({ ...form, expiry_date: e.target.value })
							}
							className={inputClass}
						/>
					</FormField>
				</div>

				<FormField label={t("insurance_premium")}>
					<input
						type="number"
						min="0"
						step="0.01"
						value={form.premium_paid}
						onChange={(e) => setForm({ ...form, premium_paid: e.target.value })}
						placeholder="650.50"
						className={inputClass}
					/>
				</FormField>
			</form>
		</ModalShell>
	);
}
