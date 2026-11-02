import type { BillActivity } from "@/type";
import { getAuthToken, UnauthorizedError } from "./auth";

async function authHeaders(): Promise<Record<string, string>> {
	const token = await getAuthToken();
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

export interface ActivityQuery {
	/** How many months containing activity to return. Server clamps to 1..24. */
	months?: number;
	/** Page backwards: only months strictly older than this YYYY-MM. */
	before?: string;
	/** Narrow to a single bill's history. */
	billId?: number;
}

/**
 * Fetches whole months of activity, newest first.
 *
 * The API pages by month rather than by row, so every month returned is complete
 * and its totals can be summed without a second request.
 */
export const fetchActivity = async (
	query: ActivityQuery = {},
): Promise<BillActivity[]> => {
	const params = new URLSearchParams();
	if (query.months !== undefined) params.set("months", String(query.months));
	if (query.before) params.set("before", query.before);
	if (query.billId !== undefined) params.set("bill_id", String(query.billId));

	const res = await fetch(`/api/activity?${params}`, {
		headers: await authHeaders(),
	});
	if (res.status === 401) throw new UnauthorizedError();
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return res.json();
};
