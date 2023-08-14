'use client'

import { Progress } from '@nextui-org/react'
import Nav from './components/Nav'

export default function Home() {
	const movies_watched = 1323;
	const movies_watchlist = 2411;
	const shows_watched = 274;
	const shows_watchlist = 821;
	const anime_watched = 166;
	const anime_watchlist = 406;

	const movie_progress = movies_watched / movies_watchlist * 100;
	const show_progress = shows_watched / shows_watchlist * 100;
	const anime_progress = anime_watched / anime_watchlist * 100;

  return (
		<div>
			<Nav />

			<Progress size='lg' label={`Movie Progess - ${movies_watched} / ${movies_watchlist}`} color='default' showValueLabel value={movie_progress} />

			<br />

			<Progress size='lg' label={`Show Progess - ${shows_watched} / ${shows_watchlist}`} color='default' showValueLabel value={show_progress} />

			<br />

			<Progress size='lg' label={`Anime Progess - ${anime_watched} / ${anime_watchlist}`} color='default' showValueLabel value={anime_progress} />
		</div>
  )
}
