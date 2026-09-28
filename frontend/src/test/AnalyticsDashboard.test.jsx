import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

/**
 * Tests for AnalyticsDashboard — Person 6
 *
 * Verifies:
 *   - KPI cards rendering with and without data
 *   - Tab navigation between overview, categories, and optimization
 *   - Demo data loading functionality
 *   - Integration of all sub-components
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

const mockSimulationResults = {
  summary: {
    total_simulation_time: 10000,
    overall_machine_utilization_pct: 88.42,
    overall_adjuster_utilization_pct: 93.15,
    avg_queue_wait_time: 3.84,
    total_failures_handled: 12430,
  },
  category_metrics: [
    { category: 'Lathe', utilization_pct: 87.1, total_failures: 7200 },
    { category: 'Turning', utilization_pct: 91.5, total_failures: 1410 },
  ],
  adjuster_metrics: [
    { id: 1, name: 'Adjuster 1', busy_time_pct: 94.2, repairs_completed: 4210 },
  ],
};

const mockOptimizationResults = {
  optimum_adjuster_count: 6,
  tradeoff_curve: [
    { adjuster_count: 4, machine_utilization: 83.5, adjuster_utilization: 94.2 },
    { adjuster_count: 6, machine_utilization: 93.8, adjuster_utilization: 82.1 },
  ],
  recommendation_reason: '6 adjusters provides 93.8% machine uptime.',
};

describe('AnalyticsDashboard', () => {
  it('renders the dashboard header', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
  });

  it('renders KPI cards with placeholder values when no data', () => {
    render(<AnalyticsDashboard />);
    // All KPI cards should show "—" placeholder
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it('renders KPI cards with actual values when data is provided', () => {
    render(
      <AnalyticsDashboard
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );
    expect(screen.getByText('88.4')).toBeInTheDocument();
    expect(screen.getByText('93.2')).toBeInTheDocument();
    expect(screen.getByText('3.84')).toBeInTheDocument();
  });

  it('renders tab navigation buttons', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/📊 overview/i)).toBeInTheDocument();
    expect(screen.getByText(/📋 categories/i)).toBeInTheDocument();
    expect(screen.getByText(/🎯 optimization/i)).toBeInTheDocument();
  });

  it('switches to categories tab on click', () => {
    render(
      <AnalyticsDashboard
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );
    fireEvent.click(screen.getByText(/📋 categories/i));
    expect(screen.getByText(/machine utilization by category/i)).toBeInTheDocument();
  });

  it('switches to optimization tab on click', () => {
    render(
      <AnalyticsDashboard
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );
    fireEvent.click(screen.getByText(/🎯 optimization/i));
    expect(screen.getByText(/recommended optimum/i)).toBeInTheDocument();
  });

  it('renders the Load Demo Data button when no prop data', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/load demo data/i)).toBeInTheDocument();
  });

  it('does not render Load Demo Data button when prop data is provided', () => {
    render(
      <AnalyticsDashboard
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );
    expect(screen.queryByText(/load demo data/i)).not.toBeInTheDocument();
  });

  it('loads demo data when button is clicked', () => {
    render(<AnalyticsDashboard />);
    fireEvent.click(screen.getByText(/load demo data/i));
    // After loading demo data, KPIs should have values (not "—")
    expect(screen.queryByText('88.4')).toBeInTheDocument();
  });

  it('renders the export panel', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/export results/i)).toBeInTheDocument();
  });

  it('renders the section with aria-label for accessibility', () => {
    render(<AnalyticsDashboard />);
    const section = screen.getByRole('region', { name: /analytics dashboard/i });
    expect(section).toBeInTheDocument();
  });
});
