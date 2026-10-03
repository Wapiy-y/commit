import type { i18n, TFunction } from "i18next";
import { ChevronRight, Globe, LogOut, Moon, PieChart, Sun } from "lucide-react";
import { ActiveTab, type User } from "@/type";

interface MenuProps {
	setActiveTab: (tab: ActiveTab) => void;
	logout: () => void;
	user: User | null;
	toggleLanguage: () => void;
	t: TFunction;
	i18n: i18n;
	isDark: boolean;
	toggleTheme: () => void;
}

export default function Menu({
	setActiveTab,
	logout,
	user,
	toggleLanguage,
	t,
	i18n,
	isDark,
	toggleTheme,
}: MenuProps) {
	return (
		<div className="space-y-4 animate-in fade-in duration-300">
			{/* Menu page */}
			<button
				onClick={() => setActiveTab(ActiveTab.ANALYTIC)}
				disabled
				className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors opacity-40"
			>
				<div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
					<PieChart size={24} />
				</div>
				<div className="flex-1 flex items-center gap-2">
					<h3 className="font-medium text-zinc-900 dark:text-zinc-50">
						{t("analytics_title")}
					</h3>
					<span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
						{t("coming_soon")}
					</span>
				</div>
			</button>

			{/* change language */}
			<button
				onClick={toggleLanguage}
				className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
			>
				<div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
					<Globe size={24} />
				</div>
				<div className="flex-1 text-left">
					<h3 className="font-medium text-zinc-900 dark:text-zinc-50">
						{t("language")}
					</h3>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						{i18n.language === "en" ? "English" : "Bahasa Melayu"}
					</p>
				</div>
				<ChevronRight size={20} className="text-zinc-300 dark:text-zinc-600" />
			</button>

			{/* change theme */}
			<button
				onClick={toggleTheme}
				aria-pressed={isDark}
				className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
			>
				<div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
					{isDark ? <Moon size={24} /> : <Sun size={24} />}
				</div>
				<div className="flex-1 text-left">
					<h3 className="font-medium text-zinc-900 dark:text-zinc-50">
						{t("appearance")}
					</h3>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						{isDark ? t("theme_dark") : t("theme_light")}
					</p>
				</div>
				<ChevronRight size={20} className="text-zinc-300 dark:text-zinc-600" />
			</button>

			{/* log out */}
			<button
				onClick={logout}
				title={`${t("logout")} ${user?.name ?? ""}`}
				className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors group"
			>
				<div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
					<LogOut size={24} />
				</div>
				<div className="flex-1 text-left">
					<h3 className="font-medium text-red-600 dark:text-red-400">
						{t("logout")}
					</h3>
				</div>
			</button>

			<div className="mt-8 mb-4 text-center">
				<p className="text-xs text-zinc-300 dark:text-zinc-600 font-mono">
					v3.0
				</p>
			</div>
		</div>
	);
}
