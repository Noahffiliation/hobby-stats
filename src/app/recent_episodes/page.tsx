'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { getRecentEpisodes, type TraktRecentEpisode } from '../api/get-data';

export default function RecentEpisodesPage() {
	const [episodes, setEpisodes] = useState<TraktRecentEpisode[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchEpisodes() {
			try {
				const response = await getRecentEpisodes();
				if (isMounted) {
					setEpisodes(response);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load recent episodes. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchEpisodes();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
				<header className="mb-8">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">Recently Watched TV Episodes</h1>
					<p className="mt-1 text-sm text-zinc-400">History of TV episodes recently watched on Trakt.</p>
				</header>

				{loading && (
					<div data-testid="loading-state" className="py-12 text-center text-zinc-400 animate-pulse">
						Loading recent episodes...
					</div>
				)}

				{error && (
					<div data-testid="error-state" className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
						{error}
					</div>
				)}

				{!loading && !error && (
					<ul className="space-y-3">
						{episodes.map((item, idx) => {
							const key = item.id || `${item.show.title}-${item.episode.season}-${item.episode.number}-${idx}`;

							return (
								<li
									key={key}
									className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition gap-2"
								>
									<div className="flex items-center space-x-2">
										<span className="font-semibold text-zinc-100">{item.show.title}</span>
										{item.show.year && (
											<span className="text-zinc-400 text-sm">({item.show.year})</span>
										)}
										<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
											S{item.episode.season} E{item.episode.number}
										</span>
									</div>
									<time className="text-xs text-zinc-400 font-mono">
										{new Date(item.watched_at).toLocaleString()}
									</time>
								</li>
							);
						})}
					</ul>
				)}
			</main>
		</div>
	);
}
