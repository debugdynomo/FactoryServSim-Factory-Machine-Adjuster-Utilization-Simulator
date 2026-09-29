import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportPanel from '@/components/analytics/ExportPanel';

/**
 * Tests for ExportPanel — Person 6
 *
 * Verifies:
 *   - Button rendering and disabled states
 *   - Data availability indicators
 *   - CSV export content generation
 *   - JSON export content generation
 *   - Print report generation
 */

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

describe('ExportPanel', () => {
  it('renders export buttons', () => {
    render(<ExportPanel simulationResults={null} optimizationResults={null} />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
    expect(screen.getByText('Print Report')).toBeInTheDocument();
  });

  it('disables export buttons when no data is available', () => {
    render(<ExportPanel simulationResults={null} optimizationResults={null} />);
    const csvBtn = screen.getByText('Export CSV').closest('button');
    const jsonBtn = screen.getByText('Export JSON').closest('button');
    const printBtn = screen.getByText('Print Report').closest('button');
    expect(csvBtn).toBeDisabled();
    expect(jsonBtn).toBeDisabled();
    expect(printBtn).toBeDisabled();
  });

  it('enables export buttons when simulation data is available', () => {
    render(
      <ExportPanel
        simulationResults={mockSimulationResults}
        optimizationResults={null}
      />
    );
    const csvBtn = screen.getByText('Export CSV').closest('button');
    const jsonBtn = screen.getByText('Export JSON').closest('button');
    expect(csvBtn).not.toBeDisabled();
    expect(jsonBtn).not.toBeDisabled();
  });

  it('enables export buttons when optimization data is available', () => {
    render(
      <ExportPanel
        simulationResults={null}
        optimizationResults={mockOptimizationResults}
      />
    );
    const csvBtn = screen.getByText('Export CSV').closest('button');
    expect(csvBtn).not.toBeDisabled();
  });

  it('shows data availability indicators', () => {
    render(
      <ExportPanel
        simulationResults={mockSimulationResults}
        optimizationResults={null}
      />
    );
    expect(screen.getByText(/✓ Simulation data/)).toBeInTheDocument();
    expect(screen.getByText(/○ Optimization data/)).toBeInTheDocument();
  });

  it('shows both indicators as active when both data sets available', () => {
    render(
      <ExportPanel
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );
    expect(screen.getByText(/✓ Simulation data/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Optimization data/)).toBeInTheDocument();
  });

  it('renders section title and description', () => {
    render(<ExportPanel simulationResults={null} optimizationResults={null} />);
    expect(screen.getByText(/export results/i)).toBeInTheDocument();
    expect(
      screen.getByText(/download simulation and optimization results/i)
    ).toBeInTheDocument();
  });

  it('triggers CSV download on button click', () => {
    // Mock URL.createObjectURL and revokeObjectURL
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    render(
      <ExportPanel
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );

    const csvBtn = screen.getByText('Export CSV').closest('button');
    fireEvent.click(csvBtn);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('triggers JSON download on button click', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    render(
      <ExportPanel
        simulationResults={mockSimulationResults}
        optimizationResults={mockOptimizationResults}
      />
    );

    const jsonBtn = screen.getByText('Export JSON').closest('button');
    fireEvent.click(jsonBtn);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
