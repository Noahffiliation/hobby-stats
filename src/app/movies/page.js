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
				{movies.map((movie, idx) => {
					const ids = movie.movie.ids || {};
					const key = ids.trakt || ids.tmdb || `${movie.movie.title}-${movie.movie.year || ''}-${idx}`;
					return (
						<li key={key}>
							{movie.movie.title}
							{movie.movie.year ? ` - ${movie.movie.year}` : ''}
						</li>
					)
				})}
			</ul>
		</div>
	);
}
