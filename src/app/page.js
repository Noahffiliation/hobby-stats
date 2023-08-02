'use client'

import { Progress } from '@nextui-org/react'
import Nav from './components/Nav'

export default function Home() {
	const movie_progress = 1323 / 2411 * 100;
	const show_progress = 274 / 821 * 100;
	const anime_progress = 166 / 406 * 100;

  return (
		<div>
			<Nav></Nav>

			{/* <h1>Media Progress</h1> */}

			<Progress size='lg' label='Movie Progess' color='default' showValueLabel value={movie_progress} />

			<br />

			<Progress size='lg' label='Show Progess' color='default' showValueLabel value={show_progress} />

			<br />

			<Progress size='lg' label='Anime Progess' color='default' showValueLabel value={anime_progress} />
		</div>
  )
}
