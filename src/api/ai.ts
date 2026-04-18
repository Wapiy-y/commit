import type { BillSummary } from "@/type";
import { getAuthToken, UnauthorizedError } from "./auth";

async function authHeaders(): Promise<Record<string, string>> {
	const token = await getAuthToken();
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

export async function fetchMonthlyInsight(
	current: BillSummary,
	previous: BillSummary,
	currentMonthYear: string,
	previousMonthYear: string,
	language: string,
): Promise<string> {
	const res = await fetch("/ai/monthly-comparison", {
		method: "POST",
		headers: await authHeaders(),
		body: JSON.stringify({
			current,
			previous,
			currentMonthYear,
			previousMonthYear,
			language,
		}),
	});
	if (res.status === 401) throw new UnauthorizedError();
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = (await res.json()) as { insight: string };
	return data.insight;
}
