import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OptimumRecommendation from '@/components/analytics/OptimumRecommendation';

/**
 * Tests for OptimumRecommendation — Person 6
 *
 * Verifies:
 *   - Empty state rendering when no data provided
 *   - Recommendation hero card with optimum count
 *   - Recommendation reason display
 *   - Efficiency tradeoff chart rendering
 *   - Tradeoff data table rendering
 *   - Optimum row highlight in the table
 */

// Mock Recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const mockOptimizationResults = {
  optimum_adjuster_count: 6,
  tradeoff_curve: [
    { adjuster_count: 2, machine_utilization: 64.2, adjuster_utilization: 99.8 },
    { adjuster_count: 4, machine_utilization: 83.5, adjuster_utilization: 94.2 },
    { adjuster_count: 6, machine_utilization: 93.8, adjuster_utilization: 82.1 },
    { adjuster_count: 8, machine_utilization: 95.1, adjuster_utilization: 64.0 },
  ],
  recommendation_reason:
    '6 adjusters provides 93.8% machine uptime. Adding 2 more adjusters yields only +1.3% uptime at 64% worker utilization.',
};

describe('OptimumRecommendation', () => {
  it('renders empty state when no optimization results provided', () => {
    render(<OptimumRecommendation optimizationResults={null} />);
    expect(
      screen.getByText(/run an optimization to receive the recommended/i)
    ).toBeInTheDocument();
  });

  it('displays the optimum adjuster count prominently', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    const elements = screen.getAllByText('6');
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/recommended optimum/i)).toBeInTheDocument();
  });

  it('displays the recommendation reason text', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    expect(
      screen.getByText(/6 adjusters provides 93\.8% machine uptime/i)
    ).toBeInTheDocument();
  });

  it('displays the efficiency tradeoff section title', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    expect(screen.getByText(/staffing efficiency tradeoff/i)).toBeInTheDocument();
  });

  it('displays the staffing options comparison table', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    expect(screen.getByText(/staffing options comparison/i)).toBeInTheDocument();
  });

  it('marks the optimum row in the tradeoff table', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    const optimumBadges = screen.getAllByText(/★ OPTIMUM/i);
    expect(optimumBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('displays machine utilization at optimum point', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    const elements = screen.getAllByText('93.8%');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays adjuster utilization at optimum point', () => {
    render(<OptimumRecommendation optimizationResults={mockOptimizationResults} />);
    const elements = screen.getAllByText('82.1%');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});
