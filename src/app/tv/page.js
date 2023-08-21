'use client'

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { getWatchlistShows } from "../api/get-data";

export default function Home() {
	const [tv, setTv] = useState([]);

	useEffect(() => {
		const fetchTv = async () => {
			getWatchlistShows().then((response) => {
				setTv(response.reverse());
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
