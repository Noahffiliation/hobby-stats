'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav';
import { getRecentMovies } from '../api/get-data';

export default function Home() {
	const [movies, setMovies] = useState([]);

	useEffect(() => {
		const fetchMovies = async () => {
			getRecentMovies().then((response) => {
				setMovies(response);
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
							{movie.movie.title} ({movie.movie.year}) - {new Date(movie.watched_at).toLocaleString()}
						</li>
						<br />
					</>
				))}
			</ul>
		</div>
	)
}
