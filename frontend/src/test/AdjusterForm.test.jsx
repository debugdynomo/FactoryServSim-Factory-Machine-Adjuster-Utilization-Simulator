import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdjusterForm from '../components/configurator/AdjusterForm';

describe('AdjusterForm', () => {
  const categories = [
    { name: 'Lathe', count: 200, mttf: 100, mean_repair_time: 10 },
    { name: 'Drilling', count: 80, mttf: 80, mean_repair_time: 8 },
  ];

  it('allows selecting multiple expertise categories', () => {
    const onChange = vi.fn();

    render(
      <AdjusterForm
        adjusters={[]}
        categories={categories}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/adjuster name/i), {
      target: { value: 'Adjuster 1' },
    });

    fireEvent.click(screen.getByLabelText('Lathe'));
    fireEvent.click(screen.getByLabelText('Drilling'));

    fireEvent.click(screen.getByRole('button', { name: /add adjuster/i }));

    expect(onChange).toHaveBeenCalledWith([
      {
        id: 1,
        name: 'Adjuster 1',
        expertise: ['Lathe', 'Drilling'],
      },
    ]);
  });

  it('requires expertise', () => {
    render(
      <AdjusterForm
        adjusters={[]}
        categories={categories}
        onChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/adjuster name/i), {
      target: { value: 'Adjuster 1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add adjuster/i }));

    expect(
      screen.getByText(/select at least one expertise/i),
    ).toBeInTheDocument();
  });
});