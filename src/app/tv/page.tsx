'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import TabNav, { type TabItem } from '../components/TabNav';
import StatusFeedback from '../components/StatusFeedback';
import {
	getRecentEpisodes,
	getWatchlistShows,
	type TraktRecentEpisode,
	type TraktWatchlistShow
} from '../api/get-data';

export default function TvPage() {
	const [watchlist, setWatchlist] = useState<TraktWatchlistShow[]>([]);
	const [recent, setRecent] = useState<TraktRecentEpisode[]>([]);
	const [activeTab, setActiveTab] = useState<'watchlist' | 'recent'>('watchlist');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchTvData() {
			try {
				const [watchlistRes, recentRes] = await Promise.all([
					getWatchlistShows(),
					getRecentEpisodes(),
				]);

				if (isMounted) {
					setWatchlist(watchlistRes.toReversed());
					setRecent(recentRes);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load TV data. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchTvData();

		return () => {
			isMounted = false;
		};
	}, []);

	const tabs: TabItem<'watchlist' | 'recent'>[] = [
		{ id: 'watchlist', label: 'Watchlist', count: watchlist.length },
		{ id: 'recent', label: 'Recently Watched', count: recent.length },
	];

	return (
		<div className="min-h-screen w-full flex flex-col items-center bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col items-center justify-center text-center">
				<header className="mb-6 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">TV Shows</h1>
					<p className="mt-1 text-sm text-zinc-400">Tracked TV series watchlist and recently watched episodes on Trakt.</p>
				</header>

				<TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

				<StatusFeedback loading={loading} loadingMessage="Loading TV shows..." error={error} />

				{!loading && !error && activeTab === 'watchlist' && (
					<ul className="w-full max-w-2xl space-y-3">
						{watchlist.map((item, idx) => {
							const key = item.id || `${item.show.title}-${item.show.year || ''}-${idx}`;

							return (
								<li
									key={key}
									className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition"
								>
									<span className="font-semibold text-zinc-100">{item.show.title}</span>
									{item.show.year && (
										<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
											{item.show.year}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				)}

				{!loading && !error && activeTab === 'recent' && (
					<ul className="w-full max-w-2xl space-y-3">
						{recent.map((item, idx) => {
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
