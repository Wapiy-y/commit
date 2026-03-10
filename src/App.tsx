import { addMonths, format, subMonths } from "date-fns";
import { Home, Menu, Receipt } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchMe, UnauthorizedError } from "./api/auth";
import { addBill, deleteBill, fetchBills, updatePayment } from "./api/bills";
import { Header } from "./components/Header";
import { NavButton } from "./components/NavButton";
import type { Bill, NewBill, User } from "./type";
import { ActiveTab } from "./type";
import { Content } from "./view/Content";
import Login from "./view/login";

export default function App() {
	const { t, i18n } = useTranslation();
	const [token, setToken] = useState<string | null>(
		localStorage.getItem("token"),
	);
	const [user, setUser] = useState<User | null>(() => {
		const stored = localStorage.getItem("user");
		return stored ? JSON.parse(stored) : null;
	});
	const [authChecking, setAuthChecking] = useState(
		!!localStorage.getItem("token"),
	);

	const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.HOME);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [bills, setBills] = useState<Bill[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Prevent loadBills from firing twice on mount when user is cached
	const billsFetchedRef = useRef(false);

	const currentMonthYear = format(currentDate, "yyyy-MM");
	const todayMonthYear = format(new Date(), "yyyy-MM");
	const isCurrentMonth = currentMonthYear === todayMonthYear;

	// Verify token on mount — silent refresh, does NOT trigger loadBills
	useEffect(() => {
		if (!token) return;
		fetchMe()
			.then((u) => {
				// Update stored user info silently without changing state reference
				// if the data is identical, to avoid re-triggering the bills effect
				localStorage.setItem("user", JSON.stringify(u));
				setUser((prev) => {
					if (JSON.stringify(prev) === JSON.stringify(u)) return prev;
					return u;
				});
			})
			.catch((err) => {
				if (err instanceof UnauthorizedError) {
					logout();
				}
			})
			.finally(() => {
				setAuthChecking(false);
			});
	}, [token]);

	// Load bills when user is available or month changes
	useEffect(() => {
		if (!user) return;

		// On mount with cached user, bills haven't been fetched yet
		// On month change, always refetch
		if (!billsFetchedRef.current || currentMonthYear) {
			billsFetchedRef.current = true;
			loadBills();
		}
	}, [currentMonthYear, user]);

	const handleLogin = (newToken: string, loggedInUser: User) => {
		billsFetchedRef.current = false;
		setToken(newToken);
		setUser(loggedInUser);
		localStorage.setItem("user", JSON.stringify(loggedInUser));
	};

	const logout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		billsFetchedRef.current = false;
		setToken(null);
		setUser(null);
		setBills([]);
	};

	const loadBills = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchBills(currentMonthYear);
			setBills(data);
			toast.success(t("bills_loaded"));
		} catch (err) {
			if (err instanceof Error && err.message === "UNAUTHORIZED") {
				logout();
			} else {
				setError(t("failed_load_bill"));
				toast.error(t("failed_load_bill"));
			}
		} finally {
			setLoading(false);
		}
	};

	const handleAddBill = async (newBill: NewBill) => {
		await addBill(newBill);
		loadBills();
	};

	const handleUpdatePayment = async (bill: Bill, amount: string) => {
		const numAmount = parseFloat(amount);
		if (Number.isNaN(numAmount)) return;

		const originalBills = [...bills];
		setBills((prev) =>
			prev.map((b) =>
				b.id === bill.id
					? { ...b, paid_amount: numAmount, is_paid: numAmount > 0 }
					: b,
			),
		);

		try {
			await updatePayment(bill.id, currentMonthYear, numAmount);
		} catch {
			setBills(originalBills);
			toast.error(t("update_payment_error"));
		}
	};

	const handleDeleteBill = async (id: number) => {
		if (!confirm(t("delete_bill_confirm"))) return;
		await deleteBill(id);
		loadBills();
	};

	const toggleLanguage = () => {
		const newLang = i18n.language === "en" ? "my" : "en";
		i18n.changeLanguage(newLang);
	};

	if (authChecking) {
		return (
			<div className="min-h-screen bg-zinc-50 flex items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
					<p className="text-sm text-zinc-400">
						{t("loading") ?? "Loading..."}
					</p>
				</div>
			</div>
		);
	}

	if (!token) {
		return <Login onLogin={handleLogin} t={t} />;
	}

	return (
		<div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-20">
			<Header
				activeTab={activeTab}
				currentDate={currentDate}
				onPrevMonth={() => setCurrentDate((d) => subMonths(d, 1))}
				onNextMonth={() => setCurrentDate((d) => addMonths(d, 1))}
			/>

			<Content
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				user={user}
				bills={bills}
				loading={loading}
				error={error}
				isCurrentMonth={isCurrentMonth}
				onAddBill={handleAddBill}
				onDeleteBill={handleDeleteBill}
				onUpdatePayment={handleUpdatePayment}
				t={t}
				i18n={i18n}
				toggleLanguage={toggleLanguage}
				logout={logout}
			/>

			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 pb-6 safe-area-bottom">
				<div className="max-w-md mx-auto flex justify-around items-center">
					<NavButton
						icon={Home}
						label={t("home_title")}
						active={activeTab === ActiveTab.HOME}
						onClick={() => setActiveTab(ActiveTab.HOME)}
					/>
					<NavButton
						icon={Receipt}
						label={t("bill_title")}
						active={activeTab === ActiveTab.BILL}
						onClick={() => setActiveTab(ActiveTab.BILL)}
					/>
					<NavButton
						icon={Menu}
						label={t("menu_title")}
						active={activeTab === ActiveTab.MENU}
						onClick={() => setActiveTab(ActiveTab.MENU)}
					/>
				</div>
			</nav>
		</div>
	);
}
