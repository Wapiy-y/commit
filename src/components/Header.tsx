import { useTranslation } from "react-i18next";
import { ActiveTab } from "../type";
import { MonthPicker } from "./MonthPicker";

interface HeaderProps {
	activeTab: ActiveTab;
	currentDate: Date;
	onSelectDate: (date: Date) => void;
}

export const Header = ({
	activeTab,
	currentDate,
	onSelectDate,
}: HeaderProps) => {
	const { t } = useTranslation();

	return (
		<header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
			<div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
				<h1 className="text-lg font-semibold tracking-tight">
					{activeTab === ActiveTab.HOME
						? t("home_title")
						: activeTab === ActiveTab.BILL
							? t("bill_title")
							: t("menu_title")}
				</h1>
				{activeTab !== ActiveTab.MENU && (
					<MonthPicker currentDate={currentDate} onSelectDate={onSelectDate} />
				)}
			</div>
		</header>
	);
};
