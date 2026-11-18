import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { SettingsProvider } from '../App.tsx';
import { createSettingsStore } from '../data/settingsRepository.ts';
import { isSoundEnabled, setSoundEnabled } from '../lib/sound.ts';
import { SoundToggle } from './SoundToggle.tsx';

it('누르면 켜지고 저장된다(기본 꺼짐)', async () => {
  const user = userEvent.setup();
  const store = createSettingsStore({ storage: null });
  render(
    <SettingsProvider store={store}>
      <SoundToggle />
    </SettingsProvider>,
  );
  const button = screen.getByRole('button', { name: '효과음·진동' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  await user.click(button);
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(store.load().sound).toBe(true);
  expect(isSoundEnabled()).toBe(true);
  setSoundEnabled(false);
});
