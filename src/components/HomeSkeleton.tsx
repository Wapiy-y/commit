function Bone({ className }: { className?: string }) {
	return (
		<div className={`bg-zinc-200 rounded-lg animate-pulse ${className}`} />
	);
}

export function HomeSkeleton() {
	return (
		<div className="space-y-6">
			<Bone className="h-4 w-36" />

			<div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
				<Bone className="h-3 w-24" />
				<Bone className="h-8 w-40" />
				<div className="flex gap-3">
					<Bone className="h-10 flex-1 rounded-xl" />
					<Bone className="h-10 flex-1 rounded-xl" />
				</div>
			</div>

			<div className="grid grid-cols-3 gap-3">
				{["total", "paid", "unpaid"].map((k) => (
					<div
						key={k}
						className="bg-white rounded-xl border border-zinc-100 p-3 space-y-2"
					>
						<Bone className="h-3 w-12" />
						<Bone className="h-6 w-8" />
					</div>
				))}
			</div>

			<div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
				<Bone className="h-3 w-32 mx-4 mt-3 mb-3" />
				{["exact", "under", "over", "unpaid"].map((k) => (
					<div
						key={k}
						className="flex items-center gap-3 px-4 py-3 border-t border-zinc-50"
					>
						<Bone className="w-8 h-8 rounded-full shrink-0" />
						<div className="flex-1 space-y-1.5">
							<Bone className="h-3 w-28" />
							<Bone className="h-2.5 w-16" />
						</div>
						<Bone className="h-3 w-10" />
					</div>
				))}
			</div>
		</div>
	);
}
