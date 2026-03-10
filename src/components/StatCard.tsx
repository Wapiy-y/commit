interface StatCardProps {
	label: string;
	value: number;
}

export function StatCard({ label, value }: StatCardProps) {
	return (
		<div className="bg-white p-4 rounded-xl border border-zinc-100">
			<div className="text-zinc-500 text-xs tracking-wider font-medium mb-1">
				{label}
			</div>
			<div className="text-2xl font-semibold">{value}</div>
		</div>
	);
}
