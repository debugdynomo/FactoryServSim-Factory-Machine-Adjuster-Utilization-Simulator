import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryBreakdown from '@/components/analytics/CategoryBreakdown';

/**
 * Tests for CategoryBreakdown — Person 6
 *
 * Verifies:
 *   - Empty state rendering when no data provided
 *   - Chart and table rendering with valid category metrics
 *   - Correct category names and values displayed
 *   - Status badges logic (Excellent/Good/Needs Attention)
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

const mockCategoryMetrics = [
  { category: 'Lathe', utilization_pct: 87.1, total_failures: 7200 },
  { category: 'Turning', utilization_pct: 91.5, total_failures: 1410 },
  { category: 'Drilling', utilization_pct: 85.3, total_failures: 2640 },
  { category: 'Soldering', utilization_pct: 93.8, total_failures: 1180 },
];

describe('CategoryBreakdown', () => {
  it('renders empty state when no data is provided', () => {
    render(<CategoryBreakdown />);
    expect(
      screen.getByText(/run a simulation to see per-category/i)
    ).toBeInTheDocument();
  });

  it('renders empty state when categoryMetrics is empty array', () => {
    render(<CategoryBreakdown categoryMetrics={[]} />);
    expect(
      screen.getByText(/run a simulation to see per-category/i)
    ).toBeInTheDocument();
  });

  it('renders chart titles when data is provided', () => {
    render(<CategoryBreakdown categoryMetrics={mockCategoryMetrics} />);
    expect(screen.getByText(/machine utilization by category/i)).toBeInTheDocument();
    expect(screen.getByText(/total failures by category/i)).toBeInTheDocument();
    expect(screen.getByText(/category summary/i)).toBeInTheDocument();
  });

  it('renders all category names in the summary table', () => {
    render(<CategoryBreakdown categoryMetrics={mockCategoryMetrics} />);
    expect(screen.getByText('Lathe')).toBeInTheDocument();
    expect(screen.getByText('Turning')).toBeInTheDocument();
    expect(screen.getByText('Drilling')).toBeInTheDocument();
    expect(screen.getByText('Soldering')).toBeInTheDocument();
  });

  it('renders utilization values in the summary table', () => {
    render(<CategoryBreakdown categoryMetrics={mockCategoryMetrics} />);
    expect(screen.getByText('87.1%')).toBeInTheDocument();
    expect(screen.getByText('91.5%')).toBeInTheDocument();
    expect(screen.getByText('93.8%')).toBeInTheDocument();
  });

  it('displays correct status badges based on utilization thresholds', () => {
    const mixedMetrics = [
      { category: 'High', utilization_pct: 95.0, total_failures: 100 },
      { category: 'Medium', utilization_pct: 80.0, total_failures: 200 },
      { category: 'Low', utilization_pct: 60.0, total_failures: 500 },
    ];
    render(<CategoryBreakdown categoryMetrics={mixedMetrics} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  });

  it('sorts categories by utilization descending', () => {
    render(<CategoryBreakdown categoryMetrics={mockCategoryMetrics} />);
    const rows = screen.getAllByRole('row');
    // Header + 4 data rows = 5 rows
    // First data row should be Soldering (93.8%), last should be Drilling (85.3%)
    const cells = rows[1].querySelectorAll('td');
    expect(cells[0].textContent).toContain('Soldering');
  });
});
