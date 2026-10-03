import { cn } from "@/lib/utils";

export const NavButton = ({
	icon: Icon,
	label,
	active,
	onClick,
}: {
	icon: React.ElementType;
	label: string;
	active?: boolean;
	onClick: () => void;
}) => {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex flex-col items-center gap-1 transition-colors",
				active
					? "text-zinc-900 dark:text-zinc-50"
					: "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300",
			)}
		>
			<Icon size={20} strokeWidth={active ? 2.5 : 2} />
			<span className="text-[12px] font-medium">{label}</span>
		</button>
	);
};
