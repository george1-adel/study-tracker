import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { Modal } from './Modal';
import { Checkbox } from './Checkbox';
import { StatCard } from './StatCard';

describe('Modal', () => {
  it('closes on Escape key press and returns focus to trigger', async () => {
    const handleClose = vi.fn();
    const triggerText = 'Open Modal';
    const modalTitleText = 'Test Modal';
    const bodyText = 'Modal Content';

    function TestWrapper() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button onClick={() => setIsOpen(true)}>{triggerText}</button>
          <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); handleClose(); }} title={modalTitleText}>
            <div>{bodyText}</div>
          </Modal>
        </div>
      );
    }

    render(<TestWrapper />);
    const triggerBtn = screen.getByRole('button', { name: triggerText });
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    await userEvent.click(triggerBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(triggerBtn);
  });

  it('traps focus inside the modal', async () => {
    const handleClose = vi.fn();
    const firstBtnText = 'First Button';
    const secondBtnText = 'Second Button';

    render(
      <Modal isOpen={true} onClose={handleClose} title="Focus Trap">
        <button>{firstBtnText}</button>
        <button>{secondBtnText}</button>
      </Modal>
    );

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    const firstBtn = screen.getByRole('button', { name: firstBtnText });
    const secondBtn = screen.getByRole('button', { name: secondBtnText });

    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    await userEvent.tab();
    expect(document.activeElement).toBe(firstBtn);

    await userEvent.tab();
    expect(document.activeElement).toBe(secondBtn);

    await userEvent.tab();
    expect(document.activeElement).toBe(closeBtn);

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(secondBtn);
  });
});

describe('Checkbox', () => {
  it('associates label with checkbox input', () => {
    const labelText = 'Accept terms';
    render(<Checkbox label={labelText} id="test-check" />);
    const checkbox = screen.getByRole('checkbox', { name: labelText });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('toggles on click and space key', async () => {
    const labelText = 'Enable notifications';
    render(<Checkbox label={labelText} />);
    const checkbox = screen.getByRole('checkbox', { name: labelText });

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    checkbox.focus();
    await userEvent.keyboard(' ');
    expect(checkbox).not.toBeChecked();
  });
});

describe('StatCard', () => {
  it('renders "—" for null, undefined, and NaN values', () => {
    const labelText = 'Study Hours';
    const { rerender } = render(<StatCard label={labelText} value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();

    rerender(<StatCard label={labelText} value={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();

    rerender(<StatCard label={labelText} value={NaN} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders valid numeric value', () => {
    const labelText = 'Sessions';
    render(<StatCard label={labelText} value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
