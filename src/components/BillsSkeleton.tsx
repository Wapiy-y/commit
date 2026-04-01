function Bone({ className }: { className?: string }) {
	return (
		<div className={`bg-zinc-200 rounded-lg animate-pulse ${className}`} />
	);
}

function BillCardSkeleton() {
	return (
		<div className="bg-white p-4 rounded-xl border border-zinc-100 flex flex-col gap-3">
			<div className="flex items-start justify-between">
				<div className="flex-1 space-y-2">
					<Bone className="h-4 w-28" />
					<div className="flex items-center gap-3">
						<Bone className="h-3 w-16" />
						<Bone className="h-3 w-10" />
						<Bone className="h-3 w-14" />
					</div>
				</div>
				<Bone className="w-8 h-8 rounded-lg shrink-0" />
			</div>
			<div className="pt-2 border-t border-zinc-100/50 flex items-center gap-3">
				<Bone className="h-3 w-20 shrink-0" />
				<Bone className="h-8 flex-1 rounded-lg" />
				<Bone className="h-6 w-10 rounded-md shrink-0" />
			</div>
		</div>
	);
}

export function BillsSkeleton() {
	return (
		<div className="space-y-4">
			<Bone className="h-12 w-full rounded-xl" />
			{["a", "b", "c", "d"].map((k) => (
				<BillCardSkeleton key={k} />
			))}
		</div>
	);
}
