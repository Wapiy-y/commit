import { format } from "date-fns";
import { Home, Menu, Receipt } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMonthlyInsight } from "./api/ai";
import { authClient, UnauthorizedError } from "./api/auth";
import {
	addBill,
	deleteBill,
	fetchBills,
	fetchBillsSummary,
	updatePayment,
} from "./api/bills";
import { Header } from "./components/Header";
import { NavButton } from "./components/NavButton";
import { useAuthSession } from "./hooks/useAuthSession";
import { useToast } from "./hooks/useToast";
import type { Bill, BillSummary, NewBill } from "./type";
import { ActiveTab } from "./type";
import { Content } from "./view/Content";
import Login from "./view/login";

export default function App() {
	const { t, i18n } = useTranslation();
	const { data: sessionData, isPending: authChecking } = useAuthSession();

	const user = sessionData?.user
		? { email: sessionData.user.email, name: sessionData.user.name ?? "" }
		: null;

	const toast = useToast();

	const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.HOME);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [bills, setBills] = useState<Bill[]>([]);
	const [summary, setSummary] = useState<BillSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [aiInsight, setAiInsight] = useState<string | null>(null);
	const [aiLoading, setAiLoading] = useState(false);

	// Tracks which month's bills are currently loaded — null means not yet loaded
	const billsMonthRef = useRef<string | null>(null);

	const currentMonthYear = format(currentDate, "yyyy-MM");
	const todayMonthYear = format(new Date(), "yyyy-MM");
	const isCurrentMonth = currentMonthYear === todayMonthYear;

	// Summary: load eagerly on mount and whenever month changes
	useEffect(() => {
		if (!user) return;
		setAiInsight(null);
		loadSummary();
	}, [currentMonthYear, user?.email]);

	// Bills: load lazily — only when the user actually visits the bill tab
	useEffect(() => {
		if (!user) return;
		if (
			activeTab === ActiveTab.BILL &&
			billsMonthRef.current !== currentMonthYear
		) {
			loadBillsList();
		}
	}, [activeTab, currentMonthYear, user?.email]);

	const logout = async () => {
		billsMonthRef.current = null;
		setBills([]);
		setSummary(null);
		await authClient.signOut();
	};

	const loadSummary = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchBillsSummary(currentMonthYear);
			setSummary(data);
		} catch (err) {
			if (err instanceof UnauthorizedError) {
				logout();
			} else {
				setError(t("failed_load_bill"));
				toast.error(t("failed_load_bill"));
			}
		} finally {
			setLoading(false);
		}
	};

	const loadBillsList = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchBills(currentMonthYear);
			setBills(data);
			billsMonthRef.current = currentMonthYear;
			toast.success(t("bills_loaded"));
		} catch (err) {
			if (err instanceof UnauthorizedError) {
				logout();
			} else {
				setError(t("failed_load_bill"));
				toast.error(t("failed_load_bill"));
			}
		} finally {
			setLoading(false);
		}
	};

	// Reload both after mutations (add / delete)
	const reloadAll = async () => {
		setLoading(true);
		setError(null);
		try {
			const [billsData, summaryData] = await Promise.all([
				fetchBills(currentMonthYear),
				fetchBillsSummary(currentMonthYear),
			]);
			setBills(billsData);
			setSummary(summaryData);
			billsMonthRef.current = currentMonthYear;
		} catch (err) {
			if (err instanceof UnauthorizedError) {
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
		await reloadAll();
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
			fetchBillsSummary(currentMonthYear)
				.then(setSummary)
				.catch(() => {});
		} catch {
			setBills(originalBills);
			toast.error(t("update_payment_error"));
		}
	};

	const handleDeleteBill = async (id: number) => {
		if (!confirm(t("delete_bill_confirm"))) return;
		await deleteBill(id);
		await reloadAll();
	};

	const handleAiInsight = async () => {
		if (!summary) return;

		const USAGE_KEY = "biko_ai_usage";
		const today = format(new Date(), "yyyy-MM-dd");
		const stored = localStorage.getItem(USAGE_KEY);
		const usage = stored ? JSON.parse(stored) : { count: 0, date: "" };
		const todayCount = usage.date === today ? usage.count : 0;

		if (todayCount >= 5) {
			toast.error(t("ai_limit_reached"));
			return;
		}

		setAiLoading(true);
		setAiInsight(null);
		try {
			const previousMonthYear = format(
				new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
				"yyyy-MM",
			);
			const previousSummary = await fetchBillsSummary(previousMonthYear);
			const insight = await fetchMonthlyInsight(
				summary,
				previousSummary,
				currentMonthYear,
				previousMonthYear,
				i18n.language,
			);
			localStorage.setItem(
				USAGE_KEY,
				JSON.stringify({ count: todayCount + 1, date: today }),
			);
			setAiInsight(insight);
		} catch (err) {
			if (err instanceof UnauthorizedError) {
				logout();
			} else {
				toast.error(t("ai_insight_error"));
			}
		} finally {
			setAiLoading(false);
		}
	};

	const toggleLanguage = () => {
		const newLang = i18n.language === "en" ? "my" : "en";
		i18n.changeLanguage(newLang);
		localStorage.setItem("language", newLang);
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

	if (!user) {
		return <Login t={t} />;
	}

	return (
		<div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-20">
			<Header
				activeTab={activeTab}
				currentDate={currentDate}
				onSelectDate={(date) => setCurrentDate(date)}
			/>

			<Content
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				user={user}
				bills={bills}
				summary={summary}
				loading={loading}
				error={error}
				isCurrentMonth={isCurrentMonth}
				onAddBill={handleAddBill}
				onDeleteBill={handleDeleteBill}
				onUpdatePayment={handleUpdatePayment}
				aiInsight={aiInsight}
				aiLoading={aiLoading}
				onAiInsight={handleAiInsight}
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
