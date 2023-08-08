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
	const [tv, setTv] = useState([]);

	useEffect(() => {
		const fetchTv = async () => {
			axios({
				method: "GET",
				url: "https://api.trakt.tv/users/noahffiliation/watchlist/shows/released",
				headers: TRAKT_HEADER
			}).then((response) => {
				response.data = response.data.reverse();
				setTv(response.data);
			}).catch((error) => {
				console.log(error);
			});
		};

		fetchTv();
	}, []);

	return (
		<div>
			<Nav />

			<ul>
				{tv.map((tv) => (
					<>
						<li key={tv.id}>
							{tv.show.title}
							{tv.show.year ? ` - ${tv.show.year}` : ''}
						</li>
						<br />
					</>
				))}
			</ul>
		</div>
	);
}
