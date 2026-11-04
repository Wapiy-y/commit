import type { TFunction } from "i18next";
import { Car, ChevronRight, Gauge, Plus, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { addVehicle, fetchVehicles } from "@/api/vehicles";
import { VehicleFormModal } from "@/components/VehicleFormModal";
import { cn } from "@/lib/utils";
import {
	formatKm,
	insuranceState,
	serviceState,
	urgency,
} from "@/lib/vehicle-status";
import type { NewVehicle, Vehicle as VehicleType } from "@/type";
import { VehicleDetail } from "./VehicleDetail";

interface VehicleProps {
	t: TFunction;
}

const pill = (tone: "ok" | "warn" | "bad" | "muted") =>
	({
		ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
		warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
		bad: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
		muted: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
	})[tone];

/**
 * Vehicle tab: a list of summary cards, each opening the full detail. The list
 * owns the data so the detail always renders from a fresh fetch — every write in
 * the detail calls back into `load`, which updates both views at once.
 */
export default function Vehicle({ t }: VehicleProps) {
	const [vehicles, setVehicles] = useState<VehicleType[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [showAdd, setShowAdd] = useState(false);

	// The fetch is split from the state update so the mount effect never sets
	// state synchronously — that triggers a cascading re-render before first paint.
	const fetchList = useCallback(() => fetchVehicles(), []);

	const load = useCallback(async () => {
		setVehicles(await fetchList());
	}, [fetchList]);

	useEffect(() => {
		let cancelled = false;
		fetchList()
			.then((rows) => {
				if (!cancelled) setVehicles(rows);
			})
			.catch(() => {
				if (!cancelled) setError(t("vehicle_load_failed"));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [fetchList, t]);

	const handleAdd = async (values: NewVehicle) => {
		await addVehicle(values);
		await load();
	};

	const selected =
		vehicles.find((vehicle) => vehicle.id === selectedId) ?? null;

	if (selected) {
		return (
			<VehicleDetail
				vehicle={selected}
				onBack={() => setSelectedId(null)}
				onChanged={load}
				onDeleted={() => {
					setSelectedId(null);
					setLoading(true);
					load().finally(() => setLoading(false));
				}}
				t={t}
			/>
		);
	}

	if (loading) {
		return (
			<div className="flex flex-col items-center gap-3 py-16">
				<div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-800 dark:border-t-zinc-200 rounded-full animate-spin" />
				<p className="text-sm text-zinc-400 dark:text-zinc-500">
					{t("loading")}
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
			</div>
		);
	}

	// Most urgent first: lapsed insurance or an overdue service surfaces at the top.
	const sorted = [...vehicles].sort((a, b) => urgency(b) - urgency(a));

	return (
		<div className="space-y-4 animate-in fade-in duration-300">
			{vehicles.length === 0 ? (
				<div className="py-16 text-center space-y-3">
					<Car size={28} className="mx-auto text-zinc-300 dark:text-zinc-700" />
					<p className="text-sm text-zinc-400 dark:text-zinc-500">
						{t("vehicle_empty")}
					</p>
				</div>
			) : (
				sorted.map((vehicle) => {
					const insurance = insuranceState(vehicle.insurance);
					const service = serviceState(vehicle);
					return (
						<button
							key={vehicle.id}
							onClick={() => setSelectedId(vehicle.id)}
							className="w-full text-left bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="font-mono text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
										{vehicle.plate_number}
									</p>
									<p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
										{vehicle.brand} {vehicle.model}
									</p>
								</div>
								<ChevronRight
									size={16}
									className="text-zinc-300 dark:text-zinc-600 mt-1"
								/>
							</div>

							<div className="flex flex-wrap items-center gap-1.5 mt-3">
								<span
									className={cn(
										"inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
										pill(
											insurance.status === "expired"
												? "bad"
												: insurance.status === "active"
													? "ok"
													: "warn",
										),
									)}
								>
									<ShieldCheck size={10} />
									{insurance.status === "none" && t("insurance_status_none")}
									{insurance.status === "expired" &&
										t("insurance_status_expired", {
											days: Math.abs(insurance.days ?? 0),
										})}
									{insurance.status === "expiring" &&
										t("insurance_status_expiring", {
											days: insurance.days ?? 0,
										})}
									{insurance.status === "active" &&
										t("insurance_until", {
											date: vehicle.insurance?.expiry_date,
										})}
								</span>

								<span
									className={cn(
										"inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
										pill(
											service.status === "overdue"
												? "bad"
												: service.status === "ok"
													? "ok"
													: "warn",
										),
									)}
								>
									<Gauge size={10} />
									{service.status === "overdue" &&
										t("service_status_overdue", {
											km: formatKm(Math.abs(service.remaining ?? 0)),
										})}
									{service.status === "due_soon" &&
										t("service_status_due_soon", {
											km: formatKm(service.remaining ?? 0),
										})}
									{service.status === "ok" &&
										t("service_status_ok", {
											km: formatKm(service.remaining ?? 0),
										})}
									{service.status === "unknown" && t("service_status_unknown")}
								</span>
							</div>

							<p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">
								{t("vehicle_odometer", {
									km: formatKm(vehicle.current_mileage),
								})}
							</p>
						</button>
					);
				})
			)}

			<button
				onClick={() => setShowAdd(true)}
				className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition-colors"
			>
				<Plus size={14} />
				{t("vehicle_add")}
			</button>

			{showAdd && (
				<VehicleFormModal
					onClose={() => setShowAdd(false)}
					onSubmit={handleAdd}
					t={t}
				/>
			)}
		</div>
	);
}
