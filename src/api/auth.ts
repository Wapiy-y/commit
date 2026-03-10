import type { User } from "@/type";

export const getToken = () => localStorage.getItem("token");

export const authHeaders = () => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${getToken()}`,
});

// Thrown only when token is genuinely invalid/expired (HTTP 401)
export class UnauthorizedError extends Error {
	constructor() {
		super("Unauthorized");
		this.name = "UnauthorizedError";
	}
}

// Thrown when the server is unreachable (no internet, timeout, etc.)
export class NetworkError extends Error {
	constructor() {
		super("Network unavailable");
		this.name = "NetworkError";
	}
}

export const fetchMe = async (): Promise<User> => {
	try {
		const res = await fetch("/api/auth/me", { headers: authHeaders() });
		if (res.status === 401) throw new UnauthorizedError();
		if (!res.ok) throw new NetworkError(); // 5xx, etc — treat as offline
		const data = await res.json();
		return data.user;
	} catch (err) {
		if (err instanceof UnauthorizedError) throw err;
		// fetch() itself throws TypeError on network failure
		throw new NetworkError();
	}
};

export const login = async (
	email: string,
	password: string,
): Promise<{ token: string; user: User }> => {
	const res = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Login failed");
	return data;
};

export const register = async (
	email: string,
	password: string,
	name: string,
): Promise<{ token: string; user: User }> => {
	const res = await fetch("/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password, name }),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Registration failed");
	return data;
};
