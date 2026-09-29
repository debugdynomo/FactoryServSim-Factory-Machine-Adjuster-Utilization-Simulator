import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PresetSelector from '../components/configurator/PresetSelector';

describe('PresetSelector', () => {
  it('renders the automotive preset', () => {
    render(<PresetSelector onSelect={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /automotive plant/i }),
    ).toBeInTheDocument();
  });

  it('passes the selected preset configuration to the parent', () => {
    const onSelect = vi.fn();

    render(<PresetSelector onSelect={onSelect} />);

    fireEvent.click(
      screen.getByRole('button', { name: /automotive plant/i }),
    );

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        simulation_time: 10000,
        machine_categories: expect.arrayContaining([
          expect.objectContaining({
            name: 'Lathe',
            count: 200,
          }),
        ]),
      }),
    );
  });
});