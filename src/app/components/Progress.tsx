import React from 'react';

interface ProgressProps {
	label?: string;
	showValueLabel?: boolean;
	value?: number;
}

export function Progress({ label, showValueLabel, value = 0 }: Readonly<ProgressProps>) {
	const percentage = Math.min(100, Math.max(0, value));
	const roundedPercentage = Math.round(percentage);

	return (
		<div
			data-testid="progress"
			data-value={value}
			className="w-full max-w-2xl mx-auto my-4 px-6"
		>
			{(label || showValueLabel) && (
				<div className="flex justify-between items-center mb-2 text-sm font-medium text-zinc-300">
					{label && <span>{label}</span>}
					{showValueLabel && <span>{roundedPercentage}%</span>}
				</div>
			)}
			<progress
				aria-label={label}
				aria-valuenow={roundedPercentage}
				aria-valuemin={0}
				aria-valuemax={100}
				value={roundedPercentage}
				max={100}
				className="w-full h-3 rounded-full overflow-hidden bg-zinc-800 accent-zinc-400 [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:bg-zinc-400 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-zinc-400 transition-all duration-300 ease-out"
			/>
		</div>
	);
}

export default Progress;
