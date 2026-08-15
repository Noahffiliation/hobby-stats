'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import TabNav, { type TabItem } from '../components/TabNav';
import StatusFeedback from '../components/StatusFeedback';
import { getDramaList, type DramaItem } from '../api/get-data';

export default function DramasPage() {
	const [planToWatch, setPlanToWatch] = useState<DramaItem[]>([]);
	const [completed, setCompleted] = useState<DramaItem[]>([]);
	const [totalPlanToWatch, setTotalPlanToWatch] = useState<number | null>(null);
	const [totalCompleted, setTotalCompleted] = useState<number | null>(null);
	const [activeTab, setActiveTab] = useState<'planToWatch' | 'completed'>('planToWatch');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchDramas() {
			try {
				const response = await getDramaList();
				if (isMounted) {
					const ptwList = response.planToWatch || [];
					const compList = response.completed || [];
					setPlanToWatch(ptwList);
					setCompleted(compList);
					setTotalPlanToWatch(response.totalPlanToWatch ?? ptwList.length);
					setTotalCompleted(response.totalCompleted ?? compList.length);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load K-drama data. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchDramas();

		return () => {
			isMounted = false;
		};
	}, []);

	const tabs: TabItem<'planToWatch' | 'completed'>[] = [
		{ id: 'planToWatch', label: 'Plan to Watch', count: totalPlanToWatch ?? undefined },
		{ id: 'completed', label: 'Completed', count: totalCompleted ?? undefined },
	];

	return (
		<div className="min-h-screen w-full flex flex-col items-center bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col items-center justify-center text-center">
				<header className="mb-6 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">K-Dramas & Asian Media</h1>
					<p className="mt-1 text-sm text-zinc-400">Tracked drama watchlist and completed history on MyDramaList.</p>
				</header>

				<TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

				<StatusFeedback loading={loading} loadingMessage="Loading K-dramas..." error={error} />

				{!loading && !error && activeTab === 'planToWatch' && (
					planToWatch.length === 0 ? (
						<p className="w-full max-w-2xl text-center py-8 text-zinc-500">No K-dramas in plan to watch.</p>
					) : (
						<ul className="w-full max-w-2xl space-y-3">
							{planToWatch.map((item, idx) => (
								<li
									key={`${item.title}-${idx}`}
									className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition"
								>
									<div className="flex items-center space-x-2">
										<span className="font-semibold text-zinc-100">{item.title}</span>
										{item.year && (
											<span className="text-zinc-400 text-xs">({item.year})</span>
										)}
										{item.country && (
											<span className="text-zinc-500 text-xs">• {item.country}</span>
										)}
									</div>
									{item.type && (
										<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
											{item.type}
										</span>
									)}
								</li>
							))}
						</ul>
					)
				)}

				{!loading && !error && activeTab === 'completed' && (
					completed.length === 0 ? (
						<p className="w-full max-w-2xl text-center py-8 text-zinc-500">No completed K-dramas found.</p>
					) : (
						<ul className="w-full max-w-2xl space-y-3">
							{completed.map((item, idx) => (
								<li
									key={`${item.title}-${idx}`}
									className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition gap-2"
								>
									<div className="flex items-center space-x-2">
										<span className="font-semibold text-zinc-100">{item.title}</span>
										{item.year && (
											<span className="text-zinc-400 text-xs">({item.year})</span>
										)}
										{item.country && (
											<span className="text-zinc-500 text-xs">• {item.country}</span>
										)}
										{item.episodes && (
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
												{item.episodes}
											</span>
										)}
									</div>
									{item.score !== undefined && (
										<div className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
											<span>★</span>
											<span>{item.score}/10</span>
										</div>
									)}
								</li>
							))}
						</ul>
					)
				)}
			</main>
		</div>
	);
}
