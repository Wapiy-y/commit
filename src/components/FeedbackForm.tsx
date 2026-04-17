import type { TFunction } from "i18next";
import { Bug, MessageSquare, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";

interface FeedbackFormProps {
	t: TFunction;
	email?: string;
}

type FormType = "feedback" | "bug";

export default function FeedbackForm({ t, email }: FeedbackFormProps) {
	const [submitted, setSubmitted] = useState(false);
	const [type, setType] = useState<FormType>("feedback");
	const [file, setFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);

		fetch("/", { method: "POST", body: data })
			.then(() => setSubmitted(true))
			.catch(() => setSubmitted(true));
	}

	if (submitted) {
		return (
			<p className="text-center text-sm text-emerald-600 py-4">
				{t("feedback_thanks")}
			</p>
		);
	}

	return (
		<form
			name="feedback"
			method="POST"
			data-netlify="true"
			encType="multipart/form-data"
			onSubmit={handleSubmit}
			className="space-y-3 pt-2"
		>
			<input type="hidden" name="form-name" value="feedback" />
			<input type="hidden" name="type" value={type} />
			{email && <input type="hidden" name="email" value={email} />}

			{/* Type toggle */}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => setType("feedback")}
					className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
						type === "feedback"
							? "bg-violet-50 border-violet-300 text-violet-700"
							: "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
					}`}
				>
					<MessageSquare size={13} />
					{t("feedback_type_feedback")}
				</button>
				<button
					type="button"
					onClick={() => setType("bug")}
					className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
						type === "bug"
							? "bg-red-50 border-red-300 text-red-700"
							: "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
					}`}
				>
					<Bug size={13} />
					{t("feedback_type_bug")}
				</button>
			</div>

			{/* Message */}
			<textarea
				name="message"
				required
				rows={3}
				placeholder={
					type === "bug"
						? t("feedback_placeholder_bug")
						: t("feedback_placeholder")
				}
				className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
			/>

			{/* File attachment */}
			<div>
				{file ? (
					<div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-600">
						<Paperclip size={13} className="shrink-0 text-zinc-400" />
						<span className="flex-1 truncate">{file.name}</span>
						<button
							type="button"
							onClick={() => {
								setFile(null);
								if (fileInputRef.current) fileInputRef.current.value = "";
							}}
							className="text-zinc-400 hover:text-zinc-600"
						>
							<X size={13} />
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
					>
						<Paperclip size={13} />
						{t("feedback_attach")}
					</button>
				)}
				<input
					ref={fileInputRef}
					type="file"
					name="attachment"
					accept="image/*,.pdf,.txt,.log"
					className="hidden"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
			</div>

			<button
				type="submit"
				className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
			>
				<Send size={14} />
				{t("feedback_send")}
			</button>
		</form>
	);
}
