import { format } from "date-fns";
import type { TFunction } from "i18next";
import type React from "react";
import { useState } from "react";
import { formatKm } from "@/lib/vehicle-status";
import type { NewService, Vehicle } from "@/type";
import {
	FormActions,
	FormError,
	FormField,
	FormWarning,
	inputClass,
} from "./FormBits";
import { ModalShell } from "./ModalShell";

interface ServiceFormModalProps {
	vehicle: Vehicle;
	onClose: () => void;
	onSubmit: (service: NewService) => Promise<void>;
	t: TFunction;
}

export function ServiceFormModal({
	vehicle,
	onClose,
	onSubmit,
	t,
}: ServiceFormModalProps) {
	const [form, setForm] = useState<NewService>({
		serviced_on: format(new Date(), "yyyy-MM-dd"),
		mileage_at_service: String(vehicle.current_mileage),
		workshop: "",
		cost: "",
		notes: "",
	});
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const entered = Number(form.mileage_at_service || 0);
	const distance = entered - vehicle.current_mileage;

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
			title={t("service_log")}
			subtitle={`${vehicle.plate_number} · ${t("service_current", {
				km: formatKm(vehicle.current_mileage),
			})}`}
			onClose={onClose}
			footer={
				<FormActions
					onCancel={onClose}
					submitLabel={t("service_save")}
					savingLabel={t("saving")}
					isSaving={isSaving}
					cancelLabel={t("cancel")}
				/>
			}
		>
			<form onSubmit={handleSubmit} id="service-form" className="space-y-4">
				<FormError message={error} />
				{entered > 0 && entered < vehicle.current_mileage && (
					<FormWarning
						message={t("service_backwards_warning", {
							km: formatKm(vehicle.current_mileage),
						})}
					/>
				)}

				<div className="grid grid-cols-2 gap-3">
					<FormField label={t("service_date")}>
						<input
							type="date"
							required
							value={form.serviced_on}
							onChange={(e) =>
								setForm({ ...form, serviced_on: e.target.value })
							}
							className={inputClass}
						/>
					</FormField>
					<FormField label={t("service_mileage")}>
						<input
							type="number"
							min="0"
							step="1"
							required
							value={form.mileage_at_service}
							onChange={(e) =>
								setForm({ ...form, mileage_at_service: e.target.value })
							}
							className={inputClass}
						/>
					</FormField>
				</div>

				{distance > 0 && (
					<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
						{t("service_next_hint", {
							km: formatKm(entered + vehicle.service_interval),
						})}
					</p>
				)}

				<FormField label={t("service_workshop")}>
					<input
						value={form.workshop}
						onChange={(e) => setForm({ ...form, workshop: e.target.value })}
						placeholder="Perodua Service Centre"
						className={inputClass}
					/>
				</FormField>

				<FormField label={t("service_cost")}>
					<input
						type="number"
						min="0"
						step="0.01"
						value={form.cost}
						onChange={(e) => setForm({ ...form, cost: e.target.value })}
						placeholder="320.00"
						className={inputClass}
					/>
				</FormField>

				<FormField label={t("service_notes")}>
					<input
						value={form.notes}
						onChange={(e) => setForm({ ...form, notes: e.target.value })}
						placeholder={t("service_notes_placeholder")}
						className={inputClass}
					/>
				</FormField>
			</form>
		</ModalShell>
	);
}
