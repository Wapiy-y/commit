export interface Bill {
	id: number;
	name: string;
	amount: string;
	due_day: number;
	start_date: string;
	duration_months: number | null;
	is_paid: boolean;
	paid_amount: number;
	category: string;
	notes: string | null;
}

export interface NewBill {
	name: string;
	amount: string;
	due_day: string;
	start_date: string;
	duration_months: string;
	category: string;
	notes: string;
}

export interface BillSummary {
	total_bills: number;
	paid_count: number;
	unpaid_count: number;
	total_commitment: number;
	total_paid: number;
	total_unpaid: number;
	true_total_paid: number;
	exact_count: number;
	underpaid_count: number;
	total_shortfall: number;
	overpaid_count: number;
	total_excess: number;
}

/** Every action the API records in `bill_activity`. */
export type ActivityAction =
	| "bill_created"
	| "bill_updated"
	| "payment_recorded"
	| "payment_changed"
	| "payment_cleared"
	| "bill_deleted";

export interface ActivitySnapshot {
	name?: string;
	notes?: string | null;
	amount?: string;
	due_day?: number;
	start_date?: string;
	duration_months?: number | null;
	category?: string;
}

export interface BillActivity {
	id: number;
	bill_id: number;
	bill_name: string;
	action: ActivityAction;
	month_year: string | null;
	amount: number | null;
	prev_amount: number | null;
	changes: {
		before?: ActivitySnapshot;
		after?: ActivitySnapshot;
	} | null;
	client: "web" | "ios";
	created_at: string;
	/** YYYY-MM, derived from created_at so the client can group without parsing dates. */
	month: string;
}

export interface User {
	email: string;
	name: string;
}

export type VehicleType = "car" | "motorcycle";
export type CoverageType = "comprehensive" | "third_party";

export interface VehicleInsurance {
	id: number;
	provider: string;
	policy_number: string;
	coverage_type: CoverageType;
	start_date: string;
	expiry_date: string;
	premium_paid: number;
	superseded_at?: string | null;
	created_at?: string;
}

export interface Vehicle {
	id: number;
	plate_number: string;
	vehicle_type: VehicleType;
	brand: string;
	model: string;
	current_mileage: number;
	mileage_updated_at: string | null;
	service_interval: number;
	next_service_mileage: number | null;
	created_at: string;
	insurance: VehicleInsurance | null;
}

export interface NewVehicle {
	plate_number: string;
	vehicle_type: VehicleType;
	brand: string;
	model: string;
	current_mileage: string;
	service_interval: string;
}

export interface VehicleService {
	id: number;
	serviced_on: string;
	mileage_at_service: number;
	workshop: string | null;
	cost: number | null;
	notes: string | null;
	created_at: string;
}

export interface NewInsurance {
	provider: string;
	policy_number: string;
	coverage_type: CoverageType;
	start_date: string;
	expiry_date: string;
	premium_paid: string;
}

export interface NewService {
	serviced_on: string;
	mileage_at_service: string;
	workshop: string;
	cost: string;
	notes: string;
}

export enum ActiveTab {
	HOME = "home",
	BILL = "bill",
	VEHICLE = "vehicle",
	RECORD = "record",
	MENU = "menu",
	ANALYTIC = "analytic",
}

export enum CategoryList {
	// Utilities
	WATER = "water",
	ELECTRIC = "electric",
	INTERNET = "internet",
	PHONE = "phone",

	// Housing
	RENT = "rent",
	MAINTENANCE = "maintenance",

	// Finance
	LOAN = "loan",
	CREDIT_CARD = "credit card",
	INSURANCE = "insurance",
	INVESTMENT = "investment",
	INSTALLMENT = "installment",

	// Subscriptions
	STREAMING = "streaming",
	SOFTWARE = "software",

	// Living
	GROCERY = "grocery",
	TRANSPORT = "transport",
	FUEL = "fuel",
	PARKING = "parking",

	OTHER = "other",
}
