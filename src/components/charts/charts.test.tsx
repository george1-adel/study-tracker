import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LineChartCard } from './LineChartCard';
import { BarChartCard } from './BarChartCard';
import { PieChartCard } from './PieChartCard';

describe('Chart Wrappers', () => {
  it('renders EmptyState when no data is provided to LineChartCard', () => {
    render(<LineChartCard title="Test Line" data={[]} xKey="x" series={[]} emptyText="No data available" />);
    expect(screen.getByText('Test Line')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders EmptyState when no data is provided to BarChartCard', () => {
    render(<BarChartCard title="Test Bar" data={[]} xKey="x" series={[]} emptyText="No bar data" />);
    expect(screen.getByText('Test Bar')).toBeInTheDocument();
    expect(screen.getByText('No bar data')).toBeInTheDocument();
  });

  it('renders EmptyState when no data is provided to PieChartCard', () => {
    render(<PieChartCard title="Test Pie" data={[]} emptyText="No pie data" />);
    expect(screen.getByText('Test Pie')).toBeInTheDocument();
    expect(screen.getByText('No pie data')).toBeInTheDocument();
  });

  it('LineChartCard renders with an explicit height set and container dir="ltr"', () => {
    const data = [{ x: 'A', y: 10 }];
    const series = [{ key: 'y', name: 'Series Y', colorType: 'focus' as const }];
    const { container } = render(
      <LineChartCard title="Line Chart" data={data} xKey="x" series={series} height={350} />
    );

    const chartContainer = container.querySelector('.chart-container');
    expect(chartContainer).toBeInTheDocument();
    expect(chartContainer).toHaveAttribute('dir', 'ltr');
    expect(chartContainer).toHaveStyle({ height: '350px' });
  });

  it('BarChartCard renders with explicit height and container dir="ltr"', () => {
    const data = [{ x: 'A', y: 10 }];
    const series = [{ key: 'y', name: 'Series Y', colorType: 'break' as const }];
    const { container } = render(
      <BarChartCard title="Bar Chart" data={data} xKey="x" series={series} height={280} />
    );

    const chartContainer = container.querySelector('.chart-container');
    expect(chartContainer).toBeInTheDocument();
    expect(chartContainer).toHaveAttribute('dir', 'ltr');
    expect(chartContainer).toHaveStyle({ height: '280px' });
  });

  it('PieChartCard renders with explicit height and container dir="ltr"', () => {
    const data = [{ name: 'Focus', value: 100, colorType: 'focus' as const }];
    const { container } = render(
      <PieChartCard title="Pie Chart" data={data} height={300} />
    );

    const chartContainer = container.querySelector('.chart-container');
    expect(chartContainer).toBeInTheDocument();
    expect(chartContainer).toHaveAttribute('dir', 'ltr');
    expect(chartContainer).toHaveStyle({ height: '300px' });
  });
});
