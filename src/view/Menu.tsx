import type { i18n, TFunction } from "i18next";
import { ChevronRight, Globe, LogOut, PieChart } from "lucide-react";
import { ActiveTab, type User } from "@/type";

interface MenuProps {
	setActiveTab: (tab: ActiveTab) => void;
	logout: () => void;
	user: User | null;
	toggleLanguage: () => void;
	t: TFunction;
	i18n: i18n;
}

export default function Menu({
	setActiveTab,
	logout,
	user,
	toggleLanguage,
	t,
	i18n,
}: MenuProps) {
	return (
		<div className="space-y-4 animate-in fade-in duration-300">
			{/* Menu page */}
			<button
				onClick={() => setActiveTab(ActiveTab.ANALYTIC)}
				disabled
				className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm transition-colors opacity-40"
			>
				<div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
					<PieChart size={24} />
				</div>
				<div className="flex-1 flex items-center gap-2">
					<h3 className="font-medium text-zinc-900">{t("analytics_title")}</h3>
					<span className="text-[10px] font-medium bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
						{t("coming_soon")}
					</span>
				</div>
			</button>

			{/* change language */}
			<button
				onClick={toggleLanguage}
				className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm hover:bg-zinc-50 transition-colors"
			>
				<div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
					<Globe size={24} />
				</div>
				<div className="flex-1 text-left">
					<h3 className="font-medium text-zinc-900">{t("language")}</h3>
					<p className="text-xs text-zinc-500">
						{i18n.language === "en" ? "English" : "Bahasa Melayu"}
					</p>
				</div>
				<ChevronRight size={20} className="text-zinc-300" />
			</button>

			{/* log out */}
			<button
				onClick={logout}
				title={`${t("logout")} ${user?.name ?? ""}`}
				className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm hover:bg-red-50 transition-colors group"
			>
				<div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
					<LogOut size={24} />
				</div>
				<div className="flex-1 text-left">
					<h3 className="font-medium text-red-600">{t("logout")}</h3>
				</div>
			</button>

			<div className="mt-8 mb-4 text-center">
				<p className="text-xs text-zinc-300 font-mono">v1.0</p>
			</div>
		</div>
	);
}
