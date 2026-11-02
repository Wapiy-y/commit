import { useTranslation } from "react-i18next";
import { ActiveTab } from "../type";
import { MonthPicker } from "./MonthPicker";

interface HeaderProps {
	activeTab: ActiveTab;
	currentDate: Date;
	onSelectDate: (date: Date) => void;
}

/**
 * Tab to i18n key. A lookup rather than a ternary chain: adding the Record tab
 * to a nested ternary also (wrongly) gave Analytic the Menu title.
 */
const TITLE_KEY: Record<ActiveTab, string> = {
	[ActiveTab.HOME]: "home_title",
	[ActiveTab.BILL]: "bill_title",
	[ActiveTab.RECORD]: "record_title",
	[ActiveTab.MENU]: "menu_title",
	[ActiveTab.ANALYTIC]: "analytics_title",
};

export const Header = ({
	activeTab,
	currentDate,
	onSelectDate,
}: HeaderProps) => {
	const { t } = useTranslation();

	return (
		<header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
			<div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
				<h1 className="text-lg font-semibold tracking-tight">
					{t(TITLE_KEY[activeTab])}
				</h1>
				{/* Record shows the whole history, grouped by month, so the month
				    picker would have nothing to select. */}
				{activeTab !== ActiveTab.MENU && activeTab !== ActiveTab.RECORD && (
					<MonthPicker currentDate={currentDate} onSelectDate={onSelectDate} />
				)}
			</div>
		</header>
	);
};
