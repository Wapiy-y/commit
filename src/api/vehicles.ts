import type {
	NewInsurance,
	NewService,
	NewVehicle,
	Vehicle,
	VehicleInsurance,
	VehicleService,
} from "@/type";
import { getAuthToken, UnauthorizedError } from "./auth";

async function authHeaders(): Promise<Record<string, string>> {
	const token = await getAuthToken();
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await fetch(url, { ...options, headers: await authHeaders() });
	if (res.status === 401) throw new UnauthorizedError();
	if (!res.ok) {
		// The API's message is the useful one ("Mileage cannot be lower than the
		// current reading"), so surface it rather than an HTTP status.
		const body = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `HTTP ${res.status}: ${res.statusText}`);
	}
	return res.json();
}

export const fetchVehicles = () => apiFetch<Vehicle[]>("/api/vehicles");

export const addVehicle = (vehicle: NewVehicle) =>
	apiFetch<Vehicle>("/api/vehicles", {
		method: "POST",
		body: JSON.stringify({
			...vehicle,
			current_mileage: Number(vehicle.current_mileage || 0),
			service_interval: Number(vehicle.service_interval || 10000),
		}),
	});

export const updateVehicle = (id: number, vehicle: NewVehicle) =>
	apiFetch<Vehicle>(`/api/vehicles/${id}`, {
		method: "PATCH",
		body: JSON.stringify({
			...vehicle,
			service_interval: Number(vehicle.service_interval || 10000),
		}),
	});

export const deleteVehicle = (id: number) =>
	apiFetch<{ success: boolean }>(`/api/vehicles/${id}`, { method: "DELETE" });

export const updateMileage = (id: number, currentMileage: number) =>
	apiFetch<Vehicle>(`/api/vehicles/${id}/mileage`, {
		method: "PATCH",
		body: JSON.stringify({ current_mileage: currentMileage }),
	});

export const fetchInsuranceHistory = (vehicleId: number) =>
	apiFetch<VehicleInsurance[]>(`/api/vehicles/${vehicleId}/insurance`);

export const renewInsurance = (vehicleId: number, policy: NewInsurance) =>
	apiFetch<VehicleInsurance>(`/api/vehicles/${vehicleId}/insurance`, {
		method: "POST",
		body: JSON.stringify({
			...policy,
			premium_paid: Number(policy.premium_paid || 0),
		}),
	});

export const fetchServiceHistory = (vehicleId: number) =>
	apiFetch<VehicleService[]>(`/api/vehicles/${vehicleId}/service`);

export const logService = (vehicleId: number, service: NewService) =>
	apiFetch<{
		id: number;
		current_mileage: number;
		next_service_mileage: number;
	}>(`/api/vehicles/${vehicleId}/service`, {
		method: "POST",
		body: JSON.stringify({
			...service,
			mileage_at_service: Number(service.mileage_at_service || 0),
			cost: service.cost === "" ? null : Number(service.cost),
		}),
	});
