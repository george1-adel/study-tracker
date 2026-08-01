import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the app name from i18n', () => {
    render(<App />);
    expect(screen.getByText('Study Tracker')).toBeInTheDocument();
  });
});
