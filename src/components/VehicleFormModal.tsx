import type { TFunction } from "i18next";
import type React from "react";
import { useState } from "react";
import { formatKm } from "@/lib/vehicle-status";
import type { NewVehicle, Vehicle } from "@/type";
import { FormActions, FormError, FormField, inputClass } from "./FormBits";
import { ModalShell } from "./ModalShell";

interface VehicleFormModalProps {
	/** Vehicles are edited in place; create mode omits the initial values. */
	initial?: Vehicle;
	onClose: () => void;
	onSubmit: (vehicle: NewVehicle) => Promise<void>;
	t: TFunction;
}

const EMPTY: NewVehicle = {
	plate_number: "",
	vehicle_type: "car",
	brand: "",
	model: "",
	current_mileage: "0",
	service_interval: "10000",
};

export function VehicleFormModal({
	initial,
	onClose,
	onSubmit,
	t,
}: VehicleFormModalProps) {
	const isEdit = Boolean(initial);
	const [form, setForm] = useState<NewVehicle>(() =>
		initial
			? {
					plate_number: initial.plate_number,
					vehicle_type: initial.vehicle_type,
					brand: initial.brand,
					model: initial.model,
					current_mileage: String(initial.current_mileage),
					service_interval: String(initial.service_interval),
				}
			: EMPTY,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Shown as the hint under the interval field, so the field's meaning ("every
	// N km") is visible as the resulting target ("next at X km").
	const mileage = Number(form.current_mileage || 0);
	const interval = Number(form.service_interval || 0);

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
			title={isEdit ? t("vehicle_edit") : t("vehicle_add")}
			onClose={onClose}
			onSubmit={handleSubmit}
			footer={
				<FormActions
					onCancel={onClose}
					submitLabel={t("vehicle_save")}
					savingLabel={t("saving")}
					isSaving={isSaving}
					cancelLabel={t("cancel")}
				/>
			}
		>
			<div className="space-y-4">
				<FormError message={error} />

				<FormField label={t("vehicle_plate")} htmlFor="vehicle-plate">
					<input
						required
						value={form.plate_number}
						onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
						id="vehicle-plate"
						placeholder="VGD 8899"
						className={`${inputClass} font-mono uppercase`}
					/>
				</FormField>

				<FormField label={t("vehicle_type_label")} htmlFor="vehicle-type">
					<select
						id="vehicle-type"
						value={form.vehicle_type}
						onChange={(e) =>
							setForm({
								...form,
								vehicle_type: e.target.value as NewVehicle["vehicle_type"],
							})
						}
						className={inputClass}
					>
						<option value="car">{t("vehicle_type_car")}</option>
						<option value="motorcycle">{t("vehicle_type_motorcycle")}</option>
					</select>
				</FormField>

				<div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
					<FormField label={t("vehicle_brand")} htmlFor="vehicle-brand">
						<input
							required
							value={form.brand}
							onChange={(e) => setForm({ ...form, brand: e.target.value })}
							id="vehicle-brand"
							placeholder="Perodua"
							className={inputClass}
						/>
					</FormField>
					<FormField label={t("vehicle_model")} htmlFor="vehicle-model">
						<input
							required
							value={form.model}
							onChange={(e) => setForm({ ...form, model: e.target.value })}
							id="vehicle-model"
							placeholder="Myvi 1.5 AV"
							className={inputClass}
						/>
					</FormField>
				</div>

				<div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
					<FormField
						htmlFor="vehicle-mileage"
						label={t("vehicle_mileage")}
						hint={isEdit ? t("vehicle_mileage_edit_hint") : undefined}
					>
						<input
							type="number"
							id="vehicle-mileage"
							min="0"
							step="1"
							value={form.current_mileage}
							onChange={(e) =>
								setForm({ ...form, current_mileage: e.target.value })
							}
							// Editing the odometer goes through Update Mileage instead,
							// because that path validates it cannot go backwards.
							disabled={isEdit}
							className={`${inputClass} disabled:opacity-50`}
						/>
					</FormField>
					<FormField
						label={t("vehicle_interval")}
						htmlFor="vehicle-interval"
						hint={
							interval > 0
								? t("vehicle_interval_hint", {
										km: formatKm(mileage + interval),
									})
								: undefined
						}
					>
						<input
							type="number"
							id="vehicle-interval"
							// Any positive whole number, matching the API. step="1000" refused
							// real intervals like 1700 with a native "enter a valid value"
							// bubble before the form could even submit.
							min="1"
							step="1"
							value={form.service_interval}
							onChange={(e) =>
								setForm({ ...form, service_interval: e.target.value })
							}
							className={inputClass}
						/>
					</FormField>
				</div>
			</div>
		</ModalShell>
	);
}
