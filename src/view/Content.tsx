import type { i18n, TFunction } from "i18next";
import type { Bill, NewBill, User } from "@/type";
import { ActiveTab } from "@/type";
import Bills from "./Bills";
import HomePage from "./Home";
import Menu from "./Menu";

interface ContentProps {
	activeTab: ActiveTab;
	setActiveTab: (tab: ActiveTab) => void;
	user: User | null;
	bills: Bill[];
	loading: boolean;
	error: string | null;
	isCurrentMonth: boolean;
	onAddBill: (bill: NewBill) => Promise<void>;
	onDeleteBill: (id: number) => Promise<void>;
	onUpdatePayment: (bill: Bill, amount: string) => Promise<void>;
	t: TFunction;
	logout: () => void;
	toggleLanguage: () => void;
	i18n: i18n;
}

export const Content = ({
	activeTab,
	setActiveTab,
	user,
	bills,
	loading,
	error,
	isCurrentMonth,
	onAddBill,
	onDeleteBill,
	onUpdatePayment,
	t,
	logout,
	toggleLanguage,
	i18n,
}: ContentProps) => {
	return (
		<main className="max-w-md mx-auto p-4">
			{activeTab === ActiveTab.HOME && (
				<HomePage
					userName={user?.name.split(" ")[0] ?? ""}
					bills={bills}
					t={t}
				/>
			)}
			{activeTab === ActiveTab.BILL && (
				<Bills
					bills={bills}
					loading={loading}
					error={error}
					isCurrentMonth={isCurrentMonth}
					onAddBill={onAddBill}
					onDeleteBill={onDeleteBill}
					onUpdatePayment={onUpdatePayment}
					t={t}
				/>
			)}
			{activeTab === ActiveTab.MENU && (
				<Menu
					setActiveTab={setActiveTab}
					logout={logout}
					user={user}
					toggleLanguage={toggleLanguage}
					t={t}
					i18n={i18n}
				/>
			)}
		</main>
	);
};
