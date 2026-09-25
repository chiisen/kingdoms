import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setReducedMotion } from './motion';

// Nothing here touches the network or the file system; the game keeps its
// progress in localStorage, so every test starts from a clean save slot.
beforeEach(() => {
  setReducedMotion(false);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  setReducedMotion(false);
  vi.useRealTimers();
});
