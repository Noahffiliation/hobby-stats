'use client'

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { getRecentEpisodes } from "../api/get-data";

export default function Home() {
	const [episodes, setEpisodes] = useState([]);

	useEffect(() => {
		const fetchEpisodes = async () => {
			getRecentEpisodes().then((response) => {
				setEpisodes(response);
			}).catch((error) => {
				console.log(error);
			});
		};

		fetchEpisodes();
	}, []);

	return (
		<div>
			<Nav />

			<ul>
				{episodes.map((episode, idx) => {
					const key = episode.id || `${episode.show.title}-${episode.episode.season}-${episode.episode.number}-${idx}`;
					return (
						<li key={key}>
							{episode.show.title} ({episode.show.year}) - Season {episode.episode.season} Episode {episode.episode.number} - {new Date(episode.watched_at).toLocaleString()}
						</li>
					)
				})}
			</ul>
		</div>
	)
}
