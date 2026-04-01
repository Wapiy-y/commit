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

export interface User {
	email: string;
	name: string;
}

export enum ActiveTab {
	HOME = "home",
	BILL = "bill",
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
