import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkConnections } from '../../lib/connections';
import { App } from './App';

vi.mock('../../lib/connections', () => ({
  checkConnections: vi.fn(),
}));

const mockedCheckConnections = vi.mocked(checkConnections);

describe('ColorSense popup', () => {
  beforeEach(() => {
    mockedCheckConnections.mockReset();
  });

  it('shows successful local connection results', async () => {
    mockedCheckConnections.mockResolvedValue({
      background: { source: 'background', status: 'ready', version: '0.1.0' },
      page: { source: 'page', status: 'ready', version: '0.1.0' },
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));

    await waitFor(() => expect(screen.getAllByText('Ready · v0.1.0')).toHaveLength(2));
    expect(screen.getByText('No page content leaves your browser.')).toBeInTheDocument();
  });

  it('presents a restricted-page failure without hiding background health', async () => {
    mockedCheckConnections.mockResolvedValue({
      background: { source: 'background', status: 'ready', version: '0.1.0' },
      page: { source: 'page', status: 'unavailable', reason: 'Cannot access a chrome:// URL.' },
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));

    expect(await screen.findByText('Cannot access a chrome:// URL.')).toBeInTheDocument();
    expect(screen.getByText('Ready · v0.1.0')).toBeInTheDocument();
  });
});
