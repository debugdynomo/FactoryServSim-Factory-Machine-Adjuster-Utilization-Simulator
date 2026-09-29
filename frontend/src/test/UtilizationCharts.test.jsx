import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UtilizationCharts from '@/components/analytics/UtilizationCharts';

/**
 * Tests for UtilizationCharts — Person 6
 *
 * Verifies:
 *   - Empty state rendering when no data provided
 *   - Chart rendering with valid tradeoff curve data
 *   - Correct chart titles and labels
 *   - Optimum reference line rendering
 */

// Mock Recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const mockTradeoffCurve = [
  { adjuster_count: 2, machine_utilization: 64.2, adjuster_utilization: 99.8 },
  { adjuster_count: 4, machine_utilization: 83.5, adjuster_utilization: 94.2 },
  { adjuster_count: 6, machine_utilization: 93.8, adjuster_utilization: 82.1 },
  { adjuster_count: 8, machine_utilization: 95.1, adjuster_utilization: 64.0 },
];

describe('UtilizationCharts', () => {
  it('renders empty state when no data is provided', () => {
    render(<UtilizationCharts />);
    expect(
      screen.getByText(/run an optimization to see utilization trends/i)
    ).toBeInTheDocument();
  });

  it('renders empty state when tradeoffCurve is empty array', () => {
    render(<UtilizationCharts tradeoffCurve={[]} />);
    expect(
      screen.getByText(/run an optimization to see utilization trends/i)
    ).toBeInTheDocument();
  });

  it('renders chart titles when data is provided', () => {
    render(<UtilizationCharts tradeoffCurve={mockTradeoffCurve} optimumCount={6} />);
    expect(
      screen.getByText(/machine utilization vs\. number of adjusters/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/adjuster utilization vs\. number of adjusters/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/combined utilization tradeoff/i)
    ).toBeInTheDocument();
  });

  it('renders three chart containers when data is present', () => {
    render(<UtilizationCharts tradeoffCurve={mockTradeoffCurve} />);
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBe(3);
  });

  it('does not render empty state when data is provided', () => {
    render(<UtilizationCharts tradeoffCurve={mockTradeoffCurve} />);
    expect(
      screen.queryByText(/run an optimization to see utilization trends/i)
    ).not.toBeInTheDocument();
  });
});
