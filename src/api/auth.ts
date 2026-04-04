import { createInternalNeonAuth } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react";

const neonAuth = createInternalNeonAuth(
	import.meta.env.VITE_NEON_AUTH_URL as string,
	{ adapter: BetterAuthReactAdapter() },
);

// authClient exposes React hooks (useSession) + signIn/signUp/signOut
export const authClient = neonAuth.adapter;

// getAuthToken uses the built-in getJWTToken helper
export const getAuthToken = () => neonAuth.getJWTToken();

// Thrown when the API rejects the token (HTTP 401)
export class UnauthorizedError extends Error {
	constructor() {
		super("Unauthorized");
		this.name = "UnauthorizedError";
	}
}

// Thrown when the server is unreachable
export class NetworkError extends Error {
	constructor() {
		super("Network unavailable");
		this.name = "NetworkError";
	}
}

interface AuthResult {
	error: { message?: string } | null;
}

type PasswordResetClient = {
	requestPasswordReset(params: {
		email: string;
		redirectTo: string;
	}): Promise<AuthResult>;
	resetPassword(params: {
		newPassword: string;
		token: string;
	}): Promise<AuthResult>;
};

export const requestPasswordReset = (email: string, redirectTo: string) =>
	(authClient as unknown as PasswordResetClient).requestPasswordReset({
		email,
		redirectTo,
	});

export const resetPassword = (newPassword: string, token: string) =>
	(authClient as unknown as PasswordResetClient).resetPassword({
		newPassword,
		token,
	});
