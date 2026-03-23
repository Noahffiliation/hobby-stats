import { render, screen } from '@testing-library/react';
import Nav from '../Nav';
import '@testing-library/jest-dom';

describe('Nav Component', () => {
    it('renders all navigation links', () => {
        render(<Nav />);

        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Movie Watchlist')).toBeInTheDocument();
        expect(screen.getByText('Recently Watched Movies')).toBeInTheDocument();
        expect(screen.getByText('TV Watchlist')).toBeInTheDocument();
        expect(screen.getByText('Recently Watched TV Episodes')).toBeInTheDocument();
        expect(screen.getByText('Recent Tracks')).toBeInTheDocument();
    });
});
