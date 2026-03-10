import type { TFunction } from "i18next";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { login, register } from "@/api/auth";
import type { User } from "@/type";

interface LoginProps {
	onLogin: (token: string, user: User) => void;
	t: TFunction;
}

export default function Login({ onLogin, t }: LoginProps) {
	const [isLogin, setIsLogin] = useState(true);
	const [authEmail, setAuthEmail] = useState("");
	const [authPassword, setAuthPassword] = useState("");
	const [authName, setAuthName] = useState("");
	const [authLoading, setAuthLoading] = useState(false);

	const handleAuth = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setAuthLoading(true);
		try {
			const data = isLogin
				? await login(authEmail, authPassword)
				: await register(authEmail, authPassword, authName);

			localStorage.setItem("token", data.token);
			onLogin(data.token, data.user);
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : t("failed_authenticate"),
			);
		} finally {
			setAuthLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
			<div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-zinc-900 mb-2">Bilku</h1>
					<p className="text-zinc-500 text-sm">{t("login_description")}</p>
				</div>

				<form onSubmit={handleAuth} className="space-y-4">
					{!isLogin && (
						<div>
							<label className="block text-xs font-medium text-zinc-500 mb-1">
								{t("login_name")}
							</label>
							<input
								type="text"
								required
								value={authName}
								onChange={(e) => setAuthName(e.target.value)}
								className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
								placeholder="John Doe"
							/>
						</div>
					)}
					<div>
						<label className="block text-xs font-medium text-zinc-500 mb-1">
							{t("login_email")}
						</label>
						<input
							type="email"
							required
							value={authEmail}
							onChange={(e) => setAuthEmail(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
							placeholder="you@example.com"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-zinc-500 mb-1">
							{t("login_password")}
						</label>
						<input
							type="password"
							required
							value={authPassword}
							onChange={(e) => setAuthPassword(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						disabled={authLoading}
						className="w-full py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
					>
						{authLoading
							? t("loading")
							: isLogin
								? t("sign_in")
								: t("created_account")}
					</button>
				</form>

				<div className="mt-6 text-center">
					<button
						onClick={() => {
							setIsLogin(!isLogin);
						}}
						className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
					>
						{isLogin ? t("signup_info") : t("login_info")}
					</button>
				</div>

				{/* Privacy concern link */}
				<div className="mt-4 text-center">
					<a
						href="privacy.html"
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors underline underline-offset-2"
					>
						{t("privacy_concern")}
					</a>
				</div>
			</div>
		</div>
	);
}
