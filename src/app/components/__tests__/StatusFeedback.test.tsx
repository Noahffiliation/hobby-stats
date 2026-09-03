import { render, screen } from '@testing-library/react';
import StatusFeedback from '../StatusFeedback';

describe('StatusFeedback Component', () => {
	it('renders loading state with message when loading is true', () => {
		render(<StatusFeedback loading={true} loadingMessage="Loading media..." />);
		expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading media...');
	});

	it('renders error state with error text when error is provided', () => {
		render(<StatusFeedback error="Failed to fetch data" />);
		expect(screen.getByTestId('error-state')).toHaveTextContent('Failed to fetch data');
	});

	it('returns null when neither loading nor error is provided', () => {
		const { container } = render(<StatusFeedback />);
		expect(container).toBeEmptyDOMElement();
	});
});
