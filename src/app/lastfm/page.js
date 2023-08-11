'use client'

import Nav from "../components/Nav";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
	const [lastfm, setLastfm] = useState([]);

	useEffect(() => {
		const fetchLastFm = async () => {
			axios({
				method: "GET",
				url: "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=noahffiliation&api_key=" + process.env.NEXT_PUBLIC_LASTFM_API_KEY + "&format=json",
			}).then((response) => {
				setLastfm(response.data.recenttracks.track);
			}).catch((error) => {
				console.log(error);
			});
		};

		fetchLastFm();
	}, []);

	return (
		<div>
			<Nav />

			<ul>
				{lastfm.map((track) => (
					<>
						<li>
							{track.artist["#text"]} - {track.name}
						</li>
						<br />
					</>
				))}
			</ul>
		</div>
	)
}
