interface StatusFeedbackProps {
	readonly loading?: boolean;
	readonly loadingMessage?: string;
	readonly error?: string | null;
}

export default function StatusFeedback({ loading, loadingMessage, error }: Readonly<StatusFeedbackProps>) {
	if (loading) {
		return (
			<div data-testid="loading-state" className="w-full max-w-2xl py-12 text-center text-zinc-400 animate-pulse">
				{loadingMessage}
			</div>
		);
	}

	if (error) {
		return (
			<div data-testid="error-state" className="w-full max-w-2xl p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
				{error}
			</div>
		);
	}

	return null;
}
