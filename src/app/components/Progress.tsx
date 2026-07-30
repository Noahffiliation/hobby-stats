import React from 'react';

interface ProgressProps {
	label?: string;
	showValueLabel?: boolean;
	value?: number;
}

export function Progress({ label, showValueLabel, value = 0 }: Readonly<ProgressProps>) {
	const percentage = Math.min(100, Math.max(0, value));

	return (
		<div data-testid="progress" aria-label={label} data-value={value} className="w-full max-w-2xl mx-auto my-4 px-6">
			{(label || showValueLabel) && (
				<div className="flex justify-between items-center mb-2 text-sm font-medium text-zinc-300">
					{label && <span>{label}</span>}
					{showValueLabel && <span>{Math.round(percentage)}%</span>}
				</div>
			)}
			<div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
				<div
					className="bg-zinc-400 h-full rounded-full transition-all duration-300 ease-out"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}

export default Progress;
