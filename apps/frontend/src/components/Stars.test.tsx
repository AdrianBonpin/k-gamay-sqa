import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Stars } from './Stars';

describe('<Stars />', () => {
  it('renders 5 stars', () => {
    render(<Stars value={3} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`star-${i}`)).toBeInTheDocument();
    }
  });

  it('fills the correct number of stars based on value', () => {
    render(<Stars value={3} />);
    expect(screen.getByTestId('star-1').getAttribute('data-filled')).toBe('true');
    expect(screen.getByTestId('star-2').getAttribute('data-filled')).toBe('true');
    expect(screen.getByTestId('star-3').getAttribute('data-filled')).toBe('true');
    expect(screen.getByTestId('star-4').getAttribute('data-filled')).toBe('false');
    expect(screen.getByTestId('star-5').getAttribute('data-filled')).toBe('false');
  });

  it('rounds fractional values for display', () => {
    render(<Stars value={3.6} />);
    expect(screen.getByTestId('star-4').getAttribute('data-filled')).toBe('true');
    expect(screen.getByTestId('star-5').getAttribute('data-filled')).toBe('false');
  });

  it('interactive: click calls onChange with the star index', () => {
    const onChange = vi.fn();
    render(<Stars value={0} interactive onChange={onChange} />);
    fireEvent.click(screen.getByTestId('star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('keyboard: ArrowRight increments value', () => {
    const onChange = vi.fn();
    render(<Stars value={2} interactive onChange={onChange} ariaLabel="rate" />);
    fireEvent.keyDown(screen.getByLabelText('rate'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('keyboard: ArrowLeft decrements value', () => {
    const onChange = vi.fn();
    render(<Stars value={3} interactive onChange={onChange} ariaLabel="rate" />);
    fireEvent.keyDown(screen.getByLabelText('rate'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('keyboard: number keys 1-5 set value directly', () => {
    const onChange = vi.fn();
    render(<Stars value={2} interactive onChange={onChange} ariaLabel="rate" />);
    fireEvent.keyDown(screen.getByLabelText('rate'), { key: '5' });
    expect(onChange).toHaveBeenCalledWith(5);
    fireEvent.keyDown(screen.getByLabelText('rate'), { key: '1' });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('non-interactive does not render buttons', () => {
    render(<Stars value={4} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('clamps ArrowRight at 5', () => {
    const onChange = vi.fn();
    render(<Stars value={5} interactive onChange={onChange} ariaLabel="rate" />);
    fireEvent.keyDown(screen.getByLabelText('rate'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('clamps ArrowLeft at 1', () => {
    const onChange = vi.fn();
    render(<Stars value={1} interactive onChange={onChange} ariaLabel="rate" />);
    fireEvent.keyDown(screen.getByLabelText('rate'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
