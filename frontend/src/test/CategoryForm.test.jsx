import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CategoryForm from '../components/configurator/CategoryForm';

describe('CategoryForm', () => {
  it('renders the category form', () => {
    render(<CategoryForm categories={[]} onChange={() => {}} />);

    expect(screen.getByLabelText(/category name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/machine count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mttf/i)).toBeInTheDocument();
  });

  it('rejects a non-positive MTTF', () => {
    render(<CategoryForm categories={[]} onChange={() => {}} />);

    fireEvent.change(screen.getByLabelText(/category name/i), {
      target: { value: 'Lathe' },
    });

    fireEvent.change(screen.getByLabelText(/mttf/i), {
      target: { value: '0' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(
      screen.getByText(/mttf must be greater than 0/i),
    ).toBeInTheDocument();
  });

  it('adds a valid category', () => {
    const onChange = vi.fn();

    render(<CategoryForm categories={[]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/category name/i), {
      target: { value: 'Lathe' },
    });

    fireEvent.change(screen.getByLabelText(/machine count/i), {
      target: { value: '200' },
    });

    fireEvent.change(screen.getByLabelText(/mttf/i), {
      target: { value: '100' },
    });

    fireEvent.change(screen.getByLabelText(/mean repair time/i), {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add category/i }));

    expect(onChange).toHaveBeenCalledWith([
      {
        name: 'Lathe',
        count: 200,
        mttf: 100,
        mean_repair_time: 10,
      },
    ]);
  });
});