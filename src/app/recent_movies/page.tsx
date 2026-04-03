'use client'

import { useEffect, useState } from 'react'
import Nav from '../components/Nav';
import { getRecentMovies } from '../api/get-data';

export default function Home() {
	const [movies, setMovies] = useState([]);

	// helper to detect valid React component (function/class/object)
	const isValidComponent = (Comp) => Comp && (typeof Comp === 'function' || typeof Comp === 'object');

	useEffect(() => {
		const fetchMovies = async () => {
			if (typeof getRecentMovies !== 'function') {
				console.warn('getRecentMovies is not a function — check your export/import.');
				return;
			}

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
			{/* render Nav only if it's a valid component to avoid "Element type is invalid" */}
			{isValidComponent(Nav) ? <Nav /> : null}

			<ul>
				{movies.map((movie) => (
					<li key={movie.id}>
						{movie.movie.title} ({movie.movie.year}) - {new Date(movie.watched_at).toLocaleString()}
						<br />
					</li>
				))}
			</ul>
		</div>
	)
}
