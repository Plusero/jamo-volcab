// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useApp, type AppState } from '../../src/app/AppContext';
import { DEFAULT_SETTINGS } from '../../src/application/settings';
import { StudySettings } from '../../src/features/settings/StudySettings';

vi.mock('../../src/app/AppContext', () => ({ useApp: vi.fn() }));
const updateSettings = vi.fn();

beforeEach(() => {
  updateSettings.mockReset();
  vi.mocked(useApp).mockReturnValue({ settings: DEFAULT_SETTINGS, updateSettings } as unknown as AppState);
});
afterEach(cleanup);

it('离开时区输入框后才报告错误，并将错误与输入框关联', () => {
  render(<StudySettings />);
  const field = screen.getByRole('textbox', { name: '时区' });
  fireEvent.change(field, { target: { value: 'Europe/' } });
  expect(field).toHaveAttribute('aria-invalid', 'false');
  expect(screen.queryByText(/无效时区/)).not.toBeInTheDocument();
  expect(updateSettings).not.toHaveBeenCalled();

  fireEvent.blur(field);
  const error = screen.getByText(/无效时区/);
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(field).toHaveAttribute('aria-describedby', error.id);
  expect(error).toHaveAttribute('aria-live', 'polite');
  expect(updateSettings).not.toHaveBeenCalled();

  fireEvent.change(field, { target: { value: 'UTC' } });
  expect(field).toHaveAttribute('aria-invalid', 'false');
  expect(field).not.toHaveAttribute('aria-describedby');
  expect(updateSettings).not.toHaveBeenCalled();
  fireEvent.blur(field);
  expect(updateSettings).toHaveBeenCalledExactlyOnceWith({ timeZone: 'UTC' });
});

it('保存有效时区前移除两侧空格，不保存未改变的值', () => {
  render(<StudySettings />);
  const field = screen.getByRole('textbox', { name: '时区' });
  fireEvent.blur(field);
  expect(updateSettings).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: ' Europe/Paris ' } });
  fireEvent.blur(field);
  expect(field).toHaveValue('Europe/Paris');
  expect(updateSettings).toHaveBeenCalledExactlyOnceWith({ timeZone: 'Europe/Paris' });
});
