import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActiveTab } from "../type";

interface HeaderProps {
	activeTab: ActiveTab;
	currentDate: Date;
	onPrevMonth: () => void;
	onNextMonth: () => void;
}

export const Header = ({
	activeTab,
	currentDate,
	onPrevMonth,
	onNextMonth,
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
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
							<button
								onClick={onPrevMonth}
								className="p-1 hover:bg-white rounded-md transition-colors"
							>
								<ChevronLeft size={16} />
							</button>
							<span className="text-sm font-medium w-20 text-center">
								{format(currentDate, "MMM yyyy")}
							</span>
							<button
								onClick={onNextMonth}
								className="p-1 hover:bg-white rounded-md transition-colors"
							>
								<ChevronRight size={16} />
							</button>
						</div>
					</div>
				)}
			</div>
		</header>
	);
};
