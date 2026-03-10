import type { Bill, NewBill } from "@/type";
import { authHeaders } from "./auth";

export const fetchBills = async (monthYear: string): Promise<Bill[]> => {
	const res = await fetch(`/api/bills?month=${monthYear}`, {
		headers: authHeaders(),
	});
	if (res.status === 401) throw new Error("UNAUTHORIZED");
	if (!res.ok) throw new Error("Failed to fetch bills");
	return res.json();
};

export const addBill = async (newBill: NewBill): Promise<void> => {
	const res = await fetch("/api/bills", {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({
			...newBill,
			duration_months: newBill.duration_months
				? parseInt(newBill.duration_months, 10)
				: null,
		}),
	});
	if (!res.ok) throw new Error("Failed to add bill");
};

export const deleteBill = async (id: number): Promise<void> => {
	const res = await fetch(`/api/bills/${id}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error("Failed to delete bill");
};

export const updatePayment = async (
	billId: number,
	monthYear: string,
	amount: number,
): Promise<void> => {
	const res = await fetch(`/api/bills/${billId}/payment`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({ month_year: monthYear, amount }),
	});
	if (!res.ok) throw new Error("Failed to update payment");
};
