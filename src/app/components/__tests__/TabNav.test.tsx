import { fireEvent, render, screen } from '@testing-library/react';
import TabNav, { type TabItem } from '../TabNav';

describe('TabNav Component', () => {
	const mockTabs: TabItem[] = [
		{ id: 'tab1', label: 'Watchlist', count: 10 },
		{ id: 'tab2', label: 'Completed' },
	];

	it('renders tab buttons with correct labels and count formatting', () => {
		const onTabChange = jest.fn();
		render(<TabNav tabs={mockTabs} activeTab="tab1" onTabChange={onTabChange} />);

		const tab1 = screen.getByRole('tab', { name: /Watchlist \(10\)/i });
		const tab2 = screen.getByRole('tab', { name: /Completed/i });

		expect(tab1).toBeInTheDocument();
		expect(tab1).toHaveAttribute('aria-selected', 'true');
		expect(tab2).toBeInTheDocument();
		expect(tab2).toHaveAttribute('aria-selected', 'false');
	});

	it('calls onTabChange with correct tab id on click', () => {
		const onTabChange = jest.fn();
		render(<TabNav tabs={mockTabs} activeTab="tab1" onTabChange={onTabChange} />);

		const tab2 = screen.getByRole('tab', { name: /Completed/i });
		fireEvent.click(tab2);

		expect(onTabChange).toHaveBeenCalledWith('tab2');
	});
});
