import { render, screen } from '@testing-library/react';
import Nav from '../Nav';
import { usePathname } from 'next/navigation';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
}));

describe('Nav Component', () => {
    beforeEach(() => {
        (usePathname as jest.Mock).mockReturnValue('/');
    });

    it('renders all navigation links and marks home active on "/"', () => {
        render(<Nav />);

        const homeLink = screen.getByRole('link', { name: 'Home' });
        expect(homeLink).toBeInTheDocument();
        expect(homeLink).toHaveAttribute('aria-current', 'page');

        const gamesLink = screen.getByRole('link', { name: 'Games' });
        expect(gamesLink).toBeInTheDocument();
        expect(gamesLink).not.toHaveAttribute('aria-current');

        expect(screen.getByText('Movies')).toBeInTheDocument();
        expect(screen.getByText('TV Shows')).toBeInTheDocument();
        expect(screen.getByText('Anime')).toBeInTheDocument();
        expect(screen.getByText('K-Dramas')).toBeInTheDocument();
        expect(screen.getByText('Recent Tracks')).toBeInTheDocument();
    });

    it('marks current route as active when pathname changes', () => {
        (usePathname as jest.Mock).mockReturnValue('/games');
        render(<Nav />);

        const gamesLink = screen.getByRole('link', { name: 'Games' });
        expect(gamesLink).toHaveAttribute('aria-current', 'page');

        const homeLink = screen.getByRole('link', { name: 'Home' });
        expect(homeLink).not.toHaveAttribute('aria-current');
    });
});
