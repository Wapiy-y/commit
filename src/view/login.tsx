import type { TFunction } from "i18next";
import { type FormEvent, useEffect, useState } from "react";
import { authClient, requestPasswordReset, resetPassword } from "@/api/auth";
import { useToast } from "@/hooks/useToast";

type AuthView = "login" | "signup" | "forgot" | "reset";

interface LoginProps {
	t: TFunction;
}

const INPUT_CLASS =
	"w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900";

const SUBMIT_CLASS =
	"w-full py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors";

export default function Login({ t }: LoginProps) {
	const [view, setView] = useState<AuthView>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [name, setName] = useState("");
	const [resetToken, setResetToken] = useState("");
	const [loading, setLoading] = useState(false);
	const toast = useToast();

	// Detect reset token in URL — switch to reset view automatically
	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get("token");
		if (token) {
			setResetToken(token);
			setView("reset");
		}
	}, []);

	const handleLoginOrSignup = async (e: FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const result =
				view === "login"
					? await authClient.signIn.email({ email, password })
					: await authClient.signUp.email({ email, password, name });

			if (result.error) {
				toast.error(result.error.message ?? t("failed_authenticate"));
			}
		} catch {
			toast.error(t("failed_authenticate"));
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPassword = async (e: FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const result = await requestPasswordReset(email, window.location.origin);
			if (result?.error) {
				toast.error(result.error.message ?? t("failed_authenticate"));
			} else {
				toast.success(t("reset_email_sent"));
				setView("login");
			}
		} catch {
			toast.error(t("failed_authenticate"));
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async (e: FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			toast.error(t("password_mismatch"));
			return;
		}
		setLoading(true);
		try {
			const result = await resetPassword(newPassword, resetToken);
			if (result?.error) {
				toast.error(result.error.message ?? t("failed_authenticate"));
			} else {
				toast.success(t("password_reset_success"));
				window.history.replaceState({}, "", window.location.pathname);
				setView("login");
			}
		} catch {
			toast.error(t("failed_authenticate"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
			<div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-zinc-900 mb-2">Bilku</h1>
					<p className="text-zinc-500 text-sm">{t("login_description")}</p>
				</div>

				{/* ── Login / Signup ── */}
				{(view === "login" || view === "signup") && (
					<form onSubmit={handleLoginOrSignup} className="space-y-4">
						{view === "signup" && (
							<div>
								<label className="block text-xs font-medium text-zinc-500 mb-1">
									{t("login_name")}
								</label>
								<input
									type="text"
									required
									value={name}
									onChange={(e) => setName(e.target.value)}
									className={INPUT_CLASS}
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
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className={INPUT_CLASS}
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
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className={INPUT_CLASS}
								placeholder="••••••••"
							/>
						</div>

						<button type="submit" disabled={loading} className={SUBMIT_CLASS}>
							{loading
								? t("loading")
								: view === "login"
									? t("sign_in")
									: t("created_account")}
						</button>

						{view === "login" && (
							<button
								type="button"
								onClick={() => setView("forgot")}
								className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
							>
								{t("forgot_password")}
							</button>
						)}
					</form>
				)}

				{/* ── Forgot Password ── */}
				{view === "forgot" && (
					<form onSubmit={handleForgotPassword} className="space-y-4">
						<p className="text-sm text-zinc-500 text-center">
							{t("forgot_password_description")}
						</p>
						<div>
							<label className="block text-xs font-medium text-zinc-500 mb-1">
								{t("login_email")}
							</label>
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className={INPUT_CLASS}
								placeholder="you@example.com"
							/>
						</div>
						<button type="submit" disabled={loading} className={SUBMIT_CLASS}>
							{loading ? t("loading") : t("send_reset_email")}
						</button>
						<button
							type="button"
							onClick={() => setView("login")}
							className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
						>
							{t("back_to_login")}
						</button>
					</form>
				)}

				{/* ── Reset Password ── */}
				{view === "reset" && (
					<form onSubmit={handleResetPassword} className="space-y-4">
						<p className="text-sm text-zinc-500 text-center">
							{t("reset_password_description")}
						</p>
						<div>
							<label className="block text-xs font-medium text-zinc-500 mb-1">
								{t("new_password")}
							</label>
							<input
								type="password"
								required
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className={INPUT_CLASS}
								placeholder="••••••••"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-zinc-500 mb-1">
								{t("confirm_password")}
							</label>
							<input
								type="password"
								required
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className={INPUT_CLASS}
								placeholder="••••••••"
							/>
						</div>
						<button type="submit" disabled={loading} className={SUBMIT_CLASS}>
							{loading ? t("loading") : t("reset_password")}
						</button>
					</form>
				)}

				{/* ── Toggle login / signup ── */}
				{(view === "login" || view === "signup") && (
					<div className="mt-6 text-center">
						<button
							onClick={() => setView(view === "login" ? "signup" : "login")}
							className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
						>
							{view === "login" ? t("signup_info") : t("login_info")}
						</button>
					</div>
				)}

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
