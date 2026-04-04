import { authClient } from "@/api/auth";

interface SessionData {
	data: { user: { email: string; name: string | null } } | null;
	isPending: boolean;
}

// useSession is a React hook at runtime — the adapter type doesn't expose it
// directly. This wrapper centralises the cast and provides a stable typed API.
export function useAuthSession(): SessionData {
	return (authClient as unknown as { useSession(): SessionData }).useSession();
}
