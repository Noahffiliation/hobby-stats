'use client'

import Nav from "../components/Nav";
import { useEffect, useState } from "react";
import axios from "axios";

const TRAKT_HEADER = {
	'Content-Type': 'application/json',
	'trakt-api-version': '2',
	'trakt-api-key': process.env.NEXT_PUBLIC_TRAKT_API_KEY
};

export default function Home() {
	const [movies, setMovies] = useState([]);

	useEffect(() => {
		const fetchMovies = async () => {
			axios({
				method: "GET",
				url: "https://api.trakt.tv/users/noahffiliation/watchlist/movies/released",
				headers: TRAKT_HEADER
			}).then((response) => {
				response.data = response.data.reverse();
				setMovies(response.data);
			}).catch((error) => {
				console.log(error);
			});
		};

		fetchMovies();
	});

	return (
		<div>
			<Nav></Nav>
			
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
