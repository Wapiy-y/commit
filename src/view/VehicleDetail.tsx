import type { TFunction } from "i18next";
import {
	ArrowLeft,
	CalendarClock,
	ChevronDown,
	ChevronUp,
	Fuel,
	Gauge,
	Pencil,
	Plus,
	ShieldCheck,
	Trash2,
	Wrench,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	deleteVehicle,
	fetchInsuranceHistory,
	fetchServiceHistory,
	logService,
	renewInsurance,
	updateMileage,
	updateVehicle,
} from "@/api/vehicles";
import { InsuranceFormModal } from "@/components/InsuranceFormModal";
import { ServiceFormModal } from "@/components/ServiceFormModal";
import { VehicleFormModal } from "@/components/VehicleFormModal";
import { cn } from "@/lib/utils";
import {
	formatKm,
	insuranceState,
	serviceProgress,
	serviceState,
} from "@/lib/vehicle-status";
import type {
	NewInsurance,
	NewService,
	NewVehicle,
	Vehicle,
	VehicleInsurance,
	VehicleService,
} from "@/type";

interface VehicleDetailProps {
	vehicle: Vehicle;
	onBack: () => void;
	/** Refetch the list: the detail is derived from it, so this updates both. */
	onChanged: () => Promise<void>;
	onDeleted: () => void;
	t: TFunction;
}

const pill = (tone: "ok" | "warn" | "bad" | "muted") =>
	({
		ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
		warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
		bad: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
		muted: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
	})[tone];

const money = (value: number | null) =>
	value === null ? "—" : `RM ${value.toFixed(2)}`;

export function VehicleDetail({
	vehicle,
	onBack,
	onChanged,
	onDeleted,
	t,
}: VehicleDetailProps) {
	const [insuranceHistory, setInsuranceHistory] = useState<VehicleInsurance[]>(
		[],
	);
	const [serviceHistory, setServiceHistory] = useState<VehicleService[]>([]);
	const [showInsuranceHistory, setShowInsuranceHistory] = useState(false);
	const [showAllServices, setShowAllServices] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [showInsurance, setShowInsurance] = useState(false);
	const [showService, setShowService] = useState(false);
	const [mileageDraft, setMileageDraft] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const policy = vehicle.insurance;
	const insurance = insuranceState(policy);
	const service = serviceState(vehicle);
	const progress = serviceProgress(vehicle);

	const reloadHistory = useCallback(async () => {
		const [policies, services] = await Promise.all([
			fetchInsuranceHistory(vehicle.id),
			fetchServiceHistory(vehicle.id),
		]);
		setInsuranceHistory(policies);
		setServiceHistory(services);
	}, [vehicle.id]);

	useEffect(() => {
		reloadHistory().catch(() => setError(t("vehicle_load_failed")));
	}, [reloadHistory, t]);

	const handleSaveVehicle = async (values: NewVehicle) => {
		await updateVehicle(vehicle.id, values);
		await onChanged();
	};

	const handleRenew = async (values: NewInsurance) => {
		await renewInsurance(vehicle.id, values);
		await Promise.all([onChanged(), reloadHistory()]);
	};

	const handleService = async (values: NewService) => {
		await logService(vehicle.id, values);
		await Promise.all([onChanged(), reloadHistory()]);
	};

	const handleMileage = async (e: React.FormEvent) => {
		e.preventDefault();
		const value = Number(mileageDraft);
		if (!mileageDraft || Number.isNaN(value)) return;
		setBusy(true);
		setError(null);
		try {
			await updateMileage(vehicle.id, value);
			setMileageDraft("");
			await onChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm(t("vehicle_delete_confirm"))) return;
		setBusy(true);
		try {
			await deleteVehicle(vehicle.id);
			onDeleted();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	const insuranceTone =
		insurance.status === "expired"
			? "bad"
			: insurance.status === "expiring" || insurance.status === "none"
				? "warn"
				: "ok";
	const serviceTone =
		service.status === "overdue"
			? "bad"
			: service.status === "due_soon" || service.status === "unknown"
				? "warn"
				: "ok";

	const visibleServices = showAllServices
		? serviceHistory
		: serviceHistory.slice(0, 3);
	const pastPolicies = insuranceHistory.filter(
		(entry) => entry.superseded_at !== null,
	);

	return (
		<div className="space-y-4 animate-in fade-in duration-300">
			<div className="flex items-center justify-between">
				<button
					onClick={onBack}
					className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
				>
					<ArrowLeft size={16} />
					{t("vehicle_back")}
				</button>
				<div className="flex items-center gap-1">
					<button
						onClick={() => setShowEdit(true)}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
						aria-label={t("vehicle_edit")}
					>
						<Pencil size={15} />
					</button>
					<button
						onClick={handleDelete}
						disabled={busy}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
						aria-label={t("delete")}
					>
						<Trash2 size={15} />
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
					<p className="text-xs text-red-700 dark:text-red-300">{error}</p>
				</div>
			)}

			{/* Identity */}
			<section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
							{vehicle.plate_number}
						</p>
						<p className="text-sm text-zinc-500 dark:text-zinc-400">
							{vehicle.brand} {vehicle.model}
						</p>
					</div>
					<span
						className={cn(
							"text-[10px] font-medium px-2 py-0.5 rounded-full",
							pill("muted"),
						)}
					>
						{vehicle.vehicle_type === "car"
							? t("vehicle_type_car")
							: t("vehicle_type_motorcycle")}
					</span>
				</div>
			</section>

			{/* Insurance */}
			<section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div className="flex items-center justify-between px-4 pt-4">
					<div className="flex items-center gap-2">
						<ShieldCheck size={15} className="text-zinc-400" />
						<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
							{t("insurance_title")}
						</h3>
					</div>
					<span
						className={cn(
							"text-[10px] font-medium px-2 py-0.5 rounded-full",
							pill(insuranceTone),
						)}
					>
						{insurance.status === "none" && t("insurance_status_none")}
						{insurance.status === "expired" &&
							t("insurance_status_expired", {
								days: Math.abs(insurance.days ?? 0),
							})}
						{insurance.status === "expiring" &&
							t("insurance_status_expiring", { days: insurance.days ?? 0 })}
						{insurance.status === "active" && t("insurance_status_active")}
					</span>
				</div>

				{policy ? (
					<div className="px-4 py-3 space-y-2">
						<div className="grid grid-cols-2 gap-y-2 text-sm">
							<div>
								<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
									{t("insurance_provider")}
								</p>
								<p className="text-zinc-800 dark:text-zinc-200">
									{policy.provider}
								</p>
							</div>
							<div>
								<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
									{t("insurance_policy")}
								</p>
								<p className="font-mono text-zinc-800 dark:text-zinc-200">
									{policy.policy_number}
								</p>
							</div>
							<div>
								<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
									{t("insurance_coverage")}
								</p>
								<p className="text-zinc-800 dark:text-zinc-200">
									{policy.coverage_type === "comprehensive"
										? t("coverage_comprehensive")
										: t("coverage_third_party")}
								</p>
							</div>
							<div>
								<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
									{t("insurance_premium")}
								</p>
								<p className="text-zinc-800 dark:text-zinc-200">
									{money(policy.premium_paid)}
								</p>
							</div>
						</div>
						<p className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
							<CalendarClock size={11} />
							{policy.start_date} → {policy.expiry_date}
						</p>
					</div>
				) : (
					<p className="px-4 py-3 text-sm text-zinc-400 dark:text-zinc-500">
						{t("insurance_empty")}
					</p>
				)}

				<div className="flex items-center gap-2 px-4 pb-4">
					<button
						onClick={() => setShowInsurance(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
					>
						<Plus size={12} />
						{policy ? t("insurance_renew") : t("insurance_add")}
					</button>
					{pastPolicies.length > 0 && (
						<button
							onClick={() => setShowInsuranceHistory((v) => !v)}
							className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
						>
							{t("insurance_history")} ({pastPolicies.length})
							{showInsuranceHistory ? (
								<ChevronUp size={12} />
							) : (
								<ChevronDown size={12} />
							)}
						</button>
					)}
				</div>

				{showInsuranceHistory && (
					<ul className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
						{pastPolicies.map((entry) => (
							<li key={entry.id} className="px-4 py-2.5">
								<p className="text-xs text-zinc-700 dark:text-zinc-300">
									{entry.provider} · {entry.policy_number}
								</p>
								<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
									{entry.start_date} → {entry.expiry_date} ·{" "}
									{money(entry.premium_paid)}
								</p>
							</li>
						))}
					</ul>
				)}
			</section>

			{/* Mileage & service */}
			<section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div className="flex items-center justify-between px-4 pt-4">
					<div className="flex items-center gap-2">
						<Gauge size={15} className="text-zinc-400" />
						<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
							{t("mileage_title")}
						</h3>
					</div>
					<span
						className={cn(
							"text-[10px] font-medium px-2 py-0.5 rounded-full",
							pill(serviceTone),
						)}
					>
						{service.status === "overdue" &&
							t("service_status_overdue", {
								km: formatKm(Math.abs(service.remaining ?? 0)),
							})}
						{service.status === "due_soon" &&
							t("service_status_due_soon", {
								km: formatKm(service.remaining ?? 0),
							})}
						{service.status === "ok" &&
							t("service_status_ok", { km: formatKm(service.remaining ?? 0) })}
						{service.status === "unknown" && t("service_status_unknown")}
					</span>
				</div>

				<div className="px-4 py-3 space-y-2">
					<div className="flex items-baseline justify-between">
						<p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
							{formatKm(vehicle.current_mileage)}
						</p>
						<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
							{vehicle.mileage_updated_at
								? t("mileage_updated_on", { date: vehicle.mileage_updated_at })
								: t("mileage_never_updated")}
						</p>
					</div>

					<div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full transition-all",
								service.status === "overdue"
									? "bg-red-500"
									: service.status === "due_soon"
										? "bg-amber-500"
										: "bg-emerald-500",
							)}
							style={{ width: `${Math.round(progress * 100)}%` }}
						/>
					</div>

					<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
						{t("mileage_next_service", {
							km: formatKm(vehicle.next_service_mileage ?? 0),
							interval: formatKm(vehicle.service_interval),
						})}
					</p>
				</div>

				<form
					onSubmit={handleMileage}
					className="flex items-center gap-2 px-4 pb-2"
				>
					<input
						type="number"
						min="0"
						step="1"
						value={mileageDraft}
						onChange={(e) => setMileageDraft(e.target.value)}
						placeholder={t("mileage_update_placeholder")}
						className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
					/>
					<button
						type="submit"
						disabled={busy || !mileageDraft}
						className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
					>
						{t("mileage_update")}
					</button>
				</form>

				<div className="px-4 pb-4">
					<button
						onClick={() => setShowService(true)}
						className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
					>
						<Wrench size={12} />
						{t("service_log")}
					</button>
				</div>

				{serviceHistory.length > 0 && (
					<div className="border-t border-zinc-100 dark:border-zinc-800">
						<div className="flex items-center justify-between px-4 py-2.5">
							<h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
								{t("service_history")}
							</h4>
							{serviceHistory.length > 3 && (
								<button
									onClick={() => setShowAllServices((v) => !v)}
									className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
								>
									{showAllServices ? t("show_less") : t("show_all")}
								</button>
							)}
						</div>
						<ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
							{visibleServices.map((entry) => (
								<li
									key={entry.id}
									className="px-4 py-2.5 flex items-start gap-2"
								>
									<Fuel
										size={12}
										className="text-zinc-300 dark:text-zinc-600 mt-0.5"
									/>
									<div className="min-w-0">
										<p className="text-xs text-zinc-700 dark:text-zinc-300">
											{formatKm(entry.mileage_at_service)} · {entry.serviced_on}
										</p>
										<p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
											{[
												entry.workshop,
												entry.cost === null ? null : money(entry.cost),
											]
												.filter(Boolean)
												.join(" · ") || t("service_no_details")}
										</p>
										{entry.notes && (
											<p className="text-[11px] text-zinc-400 dark:text-zinc-500">
												{entry.notes}
											</p>
										)}
									</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</section>

			{showEdit && (
				<VehicleFormModal
					initial={vehicle}
					onClose={() => setShowEdit(false)}
					onSubmit={handleSaveVehicle}
					t={t}
				/>
			)}
			{showInsurance && (
				<InsuranceFormModal
					current={policy}
					onClose={() => setShowInsurance(false)}
					onSubmit={handleRenew}
					t={t}
				/>
			)}
			{showService && (
				<ServiceFormModal
					vehicle={vehicle}
					onClose={() => setShowService(false)}
					onSubmit={handleService}
					t={t}
				/>
			)}
		</div>
	);
}
