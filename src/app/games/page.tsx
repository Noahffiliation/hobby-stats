'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { getGamesList, type GameItem } from '../api/get-data';

export default function GamesPage() {
	const [backlog, setBacklog] = useState<GameItem[]>([]);
	const [played, setPlayed] = useState<GameItem[]>([]);
	const [totalBacklog, setTotalBacklog] = useState<number | null>(null);
	const [totalPlayed, setTotalPlayed] = useState<number | null>(null);
	const [activeTab, setActiveTab] = useState<'backlog' | 'played'>('backlog');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchGames() {
			try {
				const response = await getGamesList();
				if (isMounted) {
					const backlogList = response.backlog || [];
					const playedList = response.played || [];
					setBacklog(backlogList);
					setPlayed(playedList);
					setTotalBacklog(response.totalBacklog ?? backlogList.length);
					setTotalPlayed(response.totalPlayed ?? playedList.length);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load games data. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchGames();

		return () => {
			isMounted = false;
		};
	}, []);

	const backlogLabel = totalBacklog !== null ? `Backlog (${totalBacklog})` : 'Backlog';
	const playedLabel = totalPlayed !== null ? `Played / Reviews (${totalPlayed})` : 'Played / Reviews';

	return (
		<div className="min-h-screen w-full flex flex-col items-center bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col items-center justify-center text-center">
				<header className="mb-6 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">Games</h1>
					<p className="mt-1 text-sm text-zinc-400">Tracked video game backlog and played history on Backloggd.</p>
				</header>

				<div role="tablist" className="flex justify-center gap-2 mb-6 border-b border-zinc-800 pb-3 w-full max-w-2xl">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'backlog'}
						onClick={() => setActiveTab('backlog')}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
							activeTab === 'backlog'
								? 'bg-zinc-800 text-white shadow-sm'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
						}`}
					>
						{backlogLabel}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'played'}
						onClick={() => setActiveTab('played')}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
							activeTab === 'played'
								? 'bg-zinc-800 text-white shadow-sm'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
						}`}
					>
						{playedLabel}
					</button>
				</div>

				{loading && (
					<div data-testid="loading-state" className="w-full max-w-2xl py-12 text-center text-zinc-400 animate-pulse">
						Loading games...
					</div>
				)}

				{error && (
					<div data-testid="error-state" className="w-full max-w-2xl p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
						{error}
					</div>
				)}

				{!loading && !error && activeTab === 'backlog' && (
					backlog.length === 0 ? (
						<p className="w-full max-w-2xl text-center py-8 text-zinc-500">No backlog games found.</p>
					) : (
						<ul className="w-full max-w-2xl space-y-3">
							{backlog.map((item, idx) => (
								<li
									key={`${item.title}-${idx}`}
									className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition"
								>
									<span className="font-semibold text-zinc-100">{item.title}</span>
									{item.platform && (
										<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
											{item.platform}
										</span>
									)}
								</li>
							))}
						</ul>
					)
				)}

				{!loading && !error && activeTab === 'played' && (
					played.length === 0 ? (
						<p className="w-full max-w-2xl text-center py-8 text-zinc-500">No played games found.</p>
					) : (
						<ul className="w-full max-w-2xl space-y-3">
							{played.map((item, idx) => (
								<li
									key={`${item.title}-${idx}`}
									className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition gap-2"
								>
									<div className="flex items-center space-x-2">
										<span className="font-semibold text-zinc-100">{item.title}</span>
										{item.status && (
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-emerald-400 border border-zinc-700">
												{item.status}
											</span>
										)}
										{item.platform && (
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
												{item.platform}
											</span>
										)}
									</div>
									{item.date && (
										<time className="text-xs text-zinc-400 font-mono">{item.date}</time>
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
