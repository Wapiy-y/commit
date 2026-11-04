/**
 * Stateful stand-in for `@/api/vehicles`, aliased in by e2e/vite.config.ts.
 *
 * The tests drive the real components — the modal, the list, the detail screen —
 * and only the network layer is replaced. Every function here mutates the same
 * in-memory state a server would, so a test can assert that adding a vehicle
 * really makes a card appear rather than replaying a canned response.
 *
 * Windows: the clock is real, so "expired" fixtures use dates in the past and
 * "active" ones a year ahead. Keeping them relative would make the status chips
 * drift with the calendar.
 */
import type {
	NewInsurance,
	NewService,
	NewVehicle,
	Vehicle,
	VehicleInsurance,
	VehicleService,
} from "@/type";

const iso = (offsetDays: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return d.toISOString().slice(0, 10);
};

let nextId = 100;

let vehicles: Vehicle[] = [
	{
		id: 1,
		plate_number: "VGD 8899",
		vehicle_type: "car",
		brand: "Perodua",
		model: "Myvi 1.5 AV",
		current_mileage: 51200,
		mileage_updated_at: iso(-3),
		service_interval: 10000,
		next_service_mileage: 60000,
		created_at: iso(-300),
		insurance: {
			id: 11,
			provider: "Zurich General Insurance",
			policy_number: "Z12-0099-11111",
			coverage_type: "third_party",
			start_date: iso(-200),
			expiry_date: iso(200),
			premium_paid: 410,
		},
	},
	{
		id: 2,
		plate_number: "WQK 1204",
		vehicle_type: "motorcycle",
		brand: "Yamaha",
		model: "NMAX 155",
		current_mileage: 18400,
		mileage_updated_at: iso(-10),
		service_interval: 4000,
		next_service_mileage: 20000,
		created_at: iso(-200),
		insurance: {
			id: 12,
			provider: "Etiqa General Insurance",
			policy_number: "P90-2211-00145",
			coverage_type: "comprehensive",
			start_date: iso(-370),
			expiry_date: iso(-4),
			premium_paid: 320.5,
		},
	},
	{
		id: 3,
		plate_number: "BKM 4412",
		vehicle_type: "car",
		brand: "Honda",
		model: "City 1.5 V",
		current_mileage: 32050,
		mileage_updated_at: iso(-60),
		service_interval: 10000,
		next_service_mileage: 40000,
		created_at: iso(-400),
		insurance: null,
	},
];

const insurance: Record<number, VehicleInsurance[]> = {
	1: [
		{
			id: 10,
			provider: "Etiqa General Insurance",
			policy_number: "P90-0021-99381",
			coverage_type: "comprehensive",
			start_date: iso(-560),
			expiry_date: iso(-200),
			premium_paid: 650.5,
			superseded_at: iso(-200),
		},
		...[],
	],
	2: [],
	3: [],
};

const services: Record<number, VehicleService[]> = {
	1: [
		{
			id: 21,
			serviced_on: iso(-30),
			mileage_at_service: 50000,
			workshop: "Perodua Service Centre",
			cost: 320,
			notes: "Engine oil, brake pads",
			created_at: iso(-30),
		},
	],
	2: [],
	3: [],
};

const find = (id: number) => {
	const vehicle = vehicles.find((v) => v.id === id);
	if (!vehicle) throw new Error("Vehicle not found");
	return vehicle;
};

export const fetchVehicles = async () => vehicles;

export const addVehicle = async (input: NewVehicle) => {
	const created: Vehicle = {
		id: nextId++,
		plate_number: input.plate_number.toUpperCase(),
		vehicle_type: input.vehicle_type,
		brand: input.brand,
		model: input.model,
		current_mileage: Number(input.current_mileage || 0),
		mileage_updated_at: iso(0),
		service_interval: Number(input.service_interval || 10000),
		next_service_mileage:
			Number(input.current_mileage || 0) +
			Number(input.service_interval || 10000),
		created_at: iso(0),
		insurance: null,
	};
	vehicles = [...vehicles, created];
	return created;
};

export const updateVehicle = async (id: number, input: NewVehicle) => {
	const vehicle = find(id);
	const updated: Vehicle = {
		...vehicle,
		plate_number: input.plate_number.toUpperCase(),
		vehicle_type: input.vehicle_type,
		brand: input.brand,
		model: input.model,
		service_interval: Number(input.service_interval || 10000),
	};
	vehicles = vehicles.map((v) => (v.id === id ? updated : v));
	return updated;
};

export const deleteVehicle = async (id: number) => {
	vehicles = vehicles.filter((v) => v.id !== id);
	return { success: true };
};

export const updateMileage = async (id: number, currentMileage: number) => {
	const vehicle = find(id);
	if (currentMileage < vehicle.current_mileage) {
		// Mirrors the API's rejection, which the form surfaces verbatim.
		throw new Error("Mileage cannot be lower than the current reading");
	}
	const updated = {
		...vehicle,
		current_mileage: currentMileage,
		mileage_updated_at: iso(0),
	};
	vehicles = vehicles.map((v) => (v.id === id ? updated : v));
	return updated;
};

export const fetchInsuranceHistory = async (vehicleId: number) =>
	insurance[vehicleId] ?? [];

export const renewInsurance = async (
	vehicleId: number,
	input: NewInsurance,
) => {
	const existing = insurance[vehicleId] ?? [];
	const policy: VehicleInsurance = {
		id: nextId++,
		provider: input.provider,
		policy_number: input.policy_number,
		coverage_type: input.coverage_type,
		start_date: input.start_date,
		expiry_date: input.expiry_date,
		premium_paid: Number(input.premium_paid || 0),
	};
	// The active policy moves to history, exactly like the API's superseded stamp.
	insurance[vehicleId] = [
		...existing.map((entry) => ({ ...entry, superseded_at: iso(0) })),
		policy,
	];
	vehicles = vehicles.map((v) =>
		v.id === vehicleId ? { ...v, insurance: policy } : v,
	);
	return policy;
};

export const fetchServiceHistory = async (vehicleId: number) =>
	services[vehicleId] ?? [];

export const logService = async (vehicleId: number, input: NewService) => {
	const vehicle = find(vehicleId);
	const mileage = Number(input.mileage_at_service || 0);
	if (mileage < vehicle.current_mileage) {
		throw new Error(
			"mileage_at_service cannot be lower than the vehicle's current mileage",
		);
	}
	const entry: VehicleService = {
		id: nextId++,
		serviced_on: input.serviced_on,
		mileage_at_service: mileage,
		workshop: input.workshop || null,
		cost: input.cost === "" ? null : Number(input.cost),
		notes: input.notes || null,
		created_at: iso(0),
	};
	services[vehicleId] = [entry, ...(services[vehicleId] ?? [])];
	const updated = {
		...vehicle,
		current_mileage: mileage,
		mileage_updated_at: input.serviced_on,
		next_service_mileage: mileage + vehicle.service_interval,
	};
	vehicles = vehicles.map((v) => (v.id === vehicleId ? updated : v));
	return {
		id: entry.id,
		current_mileage: updated.current_mileage,
		next_service_mileage: updated.next_service_mileage,
	};
};

/** Exposed for tests that need a clean slate between specs. */
export const __reset = () => {
	nextId = 100;
};
