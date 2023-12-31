'use client'

import Nav from "../components/Nav";
import { useEffect, useState } from "react";
import { getWatchlistMovies } from "../api/get-data";

export default function Home() {
	const [movies, setMovies] = useState([]);

	useEffect(() => {
		const fetchMovies = async () => {
			getWatchlistMovies().then((response) => {
				setMovies(response.reverse());
			}).catch((error) => {
				console.log(error);
			});
		};

		fetchMovies();
	}, []);

	return (
		<div>
			<Nav />

			<ul>
				{movies.map((movie) => (
					<>
						<li key={movie.id}>
							{movie.movie.title}
							{movie.movie.year ? ` - ${movie.movie.year}` : ''}
						</li>
						<br />
					</>
				))}
			</ul>
		</div>
	);
}
