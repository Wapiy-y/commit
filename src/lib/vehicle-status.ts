import type { Vehicle, VehicleInsurance } from "@/type";

/** Insurance is "expiring" inside this window. */
const INSURANCE_WARNING_DAYS = 30;
/** A service is "due soon" inside this distance. */
const SERVICE_WARNING_KM = 500;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(date: string, today = new Date()): number {
	const target = new Date(`${date}T00:00:00`);
	const start = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);
	return Math.round((target.getTime() - start.getTime()) / MS_PER_DAY);
}

export type InsuranceStatus = "none" | "expired" | "expiring" | "active";

export interface InsuranceState {
	status: InsuranceStatus;
	/** Negative when expired: how many days ago cover ended. */
	days: number | null;
}

/**
 * Derived, never stored. A stored status would go stale as soon as the date
 * passed — this app has no scheduled job to refresh it.
 */
export function insuranceState(
	insurance: VehicleInsurance | null,
	today?: Date,
): InsuranceState {
	if (!insurance) return { status: "none", days: null };
	const days = daysUntil(insurance.expiry_date, today);
	if (days < 0) return { status: "expired", days };
	if (days <= INSURANCE_WARNING_DAYS) return { status: "expiring", days };
	return { status: "active", days };
}

export type ServiceStatus = "unknown" | "overdue" | "due_soon" | "ok";

export interface ServiceState {
	status: ServiceStatus;
	/** Kilometres left before the milestone; negative once overdue. */
	remaining: number | null;
}

export function serviceState(vehicle: Vehicle): ServiceState {
	if (vehicle.next_service_mileage === null) {
		return { status: "unknown", remaining: null };
	}
	const remaining = vehicle.next_service_mileage - vehicle.current_mileage;
	if (remaining <= 0) return { status: "overdue", remaining };
	if (remaining <= SERVICE_WARNING_KM) return { status: "due_soon", remaining };
	return { status: "ok", remaining };
}

/**
 * How far through the current service interval the vehicle is, 0..1. Used for
 * the progress bar; clamped because a late service can overshoot the milestone.
 */
export function serviceProgress(vehicle: Vehicle): number {
	if (!vehicle.next_service_mileage || vehicle.service_interval <= 0) return 0;
	const start = vehicle.next_service_mileage - vehicle.service_interval;
	const driven = vehicle.current_mileage - start;
	return Math.min(Math.max(driven / vehicle.service_interval, 0), 1);
}

/**
 * Sort weight for the summary card: the worst outstanding thing first, so a
 * vehicle with lapsed insurance surfaces above one that is merely due a service.
 */
export function urgency(vehicle: Vehicle): number {
	const insurance = insuranceState(vehicle.insurance).status;
	const service = serviceState(vehicle).status;
	const rank = (status: string) =>
		({
			expired: 4,
			overdue: 3,
			expiring: 2,
			due_soon: 1,
			none: 2,
			unknown: 0,
			active: 0,
			ok: 0,
		})[status] ?? 0;
	return Math.max(rank(insurance), rank(service));
}

export const formatKm = (km: number) => `${km.toLocaleString("en-MY")} km`;
