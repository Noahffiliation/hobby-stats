import { render, screen } from '@testing-library/react';
import Progress from '../Progress';

describe('Progress Component', () => {
    it('renders with both label and showValueLabel', () => {
        render(<Progress label="Test Progress" showValueLabel value={50} />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toBeInTheDocument();
        expect(progress).toHaveAttribute('aria-label', 'Test Progress');
        expect(progress).toHaveAttribute('aria-valuenow', '50');
        expect(progress).toHaveAttribute('aria-valuemin', '0');
        expect(progress).toHaveAttribute('aria-valuemax', '100');
        expect(screen.getByText('Test Progress')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders with only label', () => {
        render(<Progress label="Only Label" value={25} />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toHaveAttribute('aria-label', 'Only Label');
        expect(progress).toHaveAttribute('aria-valuenow', '25');
        expect(screen.getByText('Only Label')).toBeInTheDocument();
        expect(screen.queryByText('25%')).not.toBeInTheDocument();
    });

    it('renders with only showValueLabel', () => {
        render(<Progress showValueLabel value={75} />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toHaveAttribute('aria-valuenow', '75');
        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('renders with neither label nor showValueLabel', () => {
        render(<Progress value={40} />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toBeInTheDocument();
        expect(screen.queryByText('40%')).not.toBeInTheDocument();
    });

    it('clamps negative values to 0%', () => {
        render(<Progress showValueLabel value={-20} />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toHaveAttribute('aria-valuenow', '0');
        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('clamps values above 100 to 100%', () => {
        render(<Progress showValueLabel value={150} />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toHaveAttribute('aria-valuenow', '100');
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('uses default value of 0 when value prop is omitted', () => {
        render(<Progress showValueLabel />);
        const progress = screen.getByRole('progressbar');
        expect(progress).toHaveAttribute('aria-valuenow', '0');
        expect(screen.getByText('0%')).toBeInTheDocument();
    });
});
