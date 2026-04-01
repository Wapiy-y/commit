import { format, setMonth, setYear } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActiveTab } from "../type";

interface HeaderProps {
	activeTab: ActiveTab;
	currentDate: Date;
	onSelectDate: (date: Date) => void;
}

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export const Header = ({
	activeTab,
	currentDate,
	onSelectDate,
}: HeaderProps) => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) setPickerYear(currentDate.getFullYear());
	}, [open, currentDate]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleMonthSelect = (monthIndex: number) => {
		let date = setMonth(currentDate, monthIndex);
		date = setYear(date, pickerYear);
		onSelectDate(date);
		setOpen(false);
	};

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
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setOpen((v) => !v)}
							className="flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
						>
							{format(currentDate, "MMM yyyy")}
							<svg
								className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path
									d="M2 4l4 4 4-4"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>

						{open && (
							<div className="absolute right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 w-56 z-20">
								{/* Year row */}
								<div className="flex items-center justify-between mb-3">
									<button
										onClick={() => setPickerYear((y) => y - 1)}
										className="p-1 hover:bg-zinc-100 rounded-md transition-colors"
									>
										<ChevronLeft size={15} />
									</button>
									<span className="text-sm font-semibold">{pickerYear}</span>
									<button
										onClick={() => setPickerYear((y) => y + 1)}
										className="p-1 hover:bg-zinc-100 rounded-md transition-colors"
									>
										<ChevronRight size={15} />
									</button>
								</div>

								{/* Month grid */}
								<div className="grid grid-cols-3 gap-1">
									{MONTHS.map((m, i) => {
										const isSelected =
											i === currentDate.getMonth() &&
											pickerYear === currentDate.getFullYear();
										return (
											<button
												key={m}
												onClick={() => handleMonthSelect(i)}
												className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${
													isSelected
														? "bg-zinc-900 text-white"
														: "hover:bg-zinc-100 text-zinc-700"
												}`}
											>
												{m}
											</button>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</header>
	);
};
