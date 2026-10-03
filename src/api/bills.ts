import type { Bill, BillSummary, NewBill } from "@/type";
import { getAuthToken, UnauthorizedError } from "./auth";

async function authHeaders(): Promise<Record<string, string>> {
	const token = await getAuthToken();
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
	const res = await fetch(url, { ...options, headers: await authHeaders() });
	if (res.status === 401) throw new UnauthorizedError();
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return res;
}

export const fetchBills = async (monthYear: string): Promise<Bill[]> => {
	const res = await apiFetch(`/api/bills?month=${monthYear}`);
	return res.json();
};

export const fetchBillsSummary = async (
	monthYear: string,
): Promise<BillSummary> => {
	const res = await apiFetch(`/api/bills/summary?month=${monthYear}`);
	return res.json();
};

/** Turns the form's string-based values into the API payload shape. */
const billPayload = (bill: NewBill) => ({
	...bill,
	duration_months: bill.duration_months
		? parseInt(bill.duration_months, 10)
		: null,
});

export const addBill = async (newBill: NewBill): Promise<void> => {
	await apiFetch("/api/bills", {
		method: "POST",
		body: JSON.stringify(billPayload(newBill)),
	});
};

/**
 * Updates a bill's own fields. Never sends a payment amount, so a bill that is
 * already marked as paid keeps the amount recorded against it.
 */
export const updateBill = async (id: number, bill: NewBill): Promise<void> => {
	await apiFetch(`/api/bills/${id}`, {
		method: "PATCH",
		body: JSON.stringify(billPayload(bill)),
	});
};

export const deleteBill = async (id: number): Promise<void> => {
	await apiFetch(`/api/bills/${id}`, { method: "DELETE" });
};

export const updatePayment = async (
	billId: number,
	monthYear: string,
	amount: number,
): Promise<void> => {
	await apiFetch(`/api/bills/${billId}/payment`, {
		method: "POST",
		body: JSON.stringify({ month_year: monthYear, amount }),
	});
};
