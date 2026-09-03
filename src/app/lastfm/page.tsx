'use client'

import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import { getLastFm, type LastFmTrack } from '../api/get-data';

export default function LastFmPage() {
	const [tracks, setTracks] = useState<LastFmTrack[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchLastFm() {
			try {
				const response = await getLastFm();
				if (isMounted) {
					setTracks(response.recenttracks.track);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.log(err);
					setError('Unable to load Last.fm scrobbles. Please try again later.');
					setLoading(false);
				}
			}
		}

		fetchLastFm();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="min-h-screen w-full flex flex-col items-center bg-zinc-950 text-zinc-100">
			<Nav />

			<main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col items-center justify-center text-center">
				<header className="mb-8 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight text-white">Recent Tracks</h1>
					<p className="mt-1 text-sm text-zinc-400">Recently scrobbled music on Last.fm.</p>
				</header>

				{loading && (
					<div data-testid="loading-state" className="w-full max-w-2xl py-12 text-center text-zinc-400 animate-pulse">
						Loading recent tracks...
					</div>
				)}

				{error && (
					<div data-testid="error-state" className="w-full max-w-2xl p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-center text-sm">
						{error}
					</div>
				)}

				{!loading && !error && (
					<ul className="w-full max-w-2xl space-y-3">
						{tracks.map((track, idx) => {
							const key = `${track.mbid || track.name}-${idx}`;

							return (
								<li
									key={key}
									className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition"
								>
									<div className="flex flex-col">
										<span className="font-semibold text-zinc-100">{track.name}</span>
										<span className="text-sm text-zinc-400">{track.artist['#text']}</span>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</main>
		</div>
	);
}
