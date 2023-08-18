'use client'

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import axios from "axios";

const TRAKT_HEADER = {
	'Content-Type': 'application/json',
	'trakt-api-version': '2',
	'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY
};

export default function Home() {
	const [episodes, setEpisodes] = useState([]);

	useEffect(() => {
		const fetchEpisodes = async () => {
			axios({
				method: "GET",
				url: 'https://api.trakt.tv/users/noahffiliation/history/shows?limit=25',
				headers: TRAKT_HEADER
			}).then((response) => {
				setEpisodes(response.data);
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
				{episodes.map((episode) => (
					<>
						<li key={episode.id}>
							{episode.show.title} ({episode.show.year}) - Season {episode.episode.season} Episode {episode.episode.number} - {new Date(episode.watched_at).toLocaleString()}
						</li>
						<br />
					</>
				))}
			</ul>
		</div>
	)
}
