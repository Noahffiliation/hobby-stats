'use client'

import Nav from "../components/Nav";
import { useEffect, useState } from "react";
import { getLastFm } from "../api/get-data";

export default function Home() {
	const [lastfm, setLastfm] = useState([]);

	useEffect(() => {
		const fetchLastFm = async () => {
			getLastFm().then((response) => {
				setLastfm(response.recenttracks.track);
			}).catch((error) => {
				console.log(error);
			})
		};

		fetchLastFm();
	}, []);

	return (
		<div>
			<Nav />

			<ul>
				{lastfm.map((track) => (
					<>
						<li key={track.mbid}>
							{track.artist["#text"]} - {track.name}
						</li>
						<br />
					</>
				))}
			</ul>
		</div>
	)
}
