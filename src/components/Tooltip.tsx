import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipProps {
	text: string;
	align?: "center" | "right";
}

export function Tooltip({ text, align = "center" }: TooltipProps) {
	return (
		<div className="group relative">
			<HelpCircle size={12} className="text-zinc-400 cursor-help" />
			<div
				className={cn(
					"absolute bottom-full mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded",
					"opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10",
					align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
				)}
			>
				{text}
				<div
					className={cn(
						"absolute top-full border-4 border-transparent border-t-zinc-800",
						align === "right" ? "right-1" : "left-1/2 -translate-x-1/2",
					)}
				/>
			</div>
		</div>
	);
}
