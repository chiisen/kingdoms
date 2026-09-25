import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Game from '@/game/Game';
import * as E from '@/game/engine';

/** Mirrors the map label formatting in Game.tsx so labels can be compared to state. */
const compact = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}萬` : Math.round(n).toLocaleString('zh-TW');

const display = (selector: string) =>
  Array.from(document.querySelectorAll(selector)).map((el) => el.textContent ?? '');

const treasury = () => display('.treasury .animated-number-value');
const garrison = () => document.querySelector('.garrison .animated-number-value')?.textContent;
const commandPoints = () => document.querySelector('.ap-block .animated-number-value')?.textContent;

const button = (text: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes(text));

/** Runs pending timers and re-renders. The second pass runs timers that the
    first pass scheduled (an update schedules the counter's own fallback). */
function settle(ms = 2000) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function startCampaign() {
  render(<Game />);
  fireEvent.click(document.querySelector('.setup-dialog .gold-button')!);
}

const savedGame = () => E.loadGame(localStorage.getItem(E.STORAGE_KEY) ?? '');

describe('the game shell', () => {
  it('opens on the faction choice and starts a symmetric campaign', () => {
    vi.useFakeTimers();
    render(<Game />);

    expect(document.querySelector('.setup-dialog')).not.toBeNull();
    expect(localStorage.getItem(E.STORAGE_KEY)).toBeNull();

    fireEvent.click(document.querySelector('.setup-dialog .gold-button')!);

    expect(document.querySelector('.setup-dialog')).toBeNull();
    expect(document.querySelectorAll('.city')).toHaveLength(15);
    expect(treasury()).toEqual(['4,200', '18,000', '36,000']);
    expect(commandPoints()).toBe('3');
    expect(document.querySelector('.legend')?.textContent).toContain('劉備3');
    // Progress is written to the browser as soon as the campaign begins.
    expect(savedGame().turn).toBe(1);
  });

  it('applies a city order to the panel, the map label and the difference', () => {
    vi.useFakeTimers();
    startCampaign();
    expect(garrison()).toBe('16,000');

    fireEvent.click(button('徵募兵卒')!);

    // Both differences are advertised immediately, before the counters run.
    const garrisonChip = document.querySelector('.garrison .delta-chip');
    const spendChip = document.querySelector('.treasury .delta-chip')?.textContent ?? '';
    expect(garrisonChip?.textContent).toBe('+2,500');
    expect(garrisonChip?.className).toContain('up');
    expect(spendChip.startsWith('−')).toBe(true);
    expect(button('徵募兵卒')?.className).toContain('is-fired');
    expect(document.querySelector('.status-bar output')?.textContent).toContain('諸葛亮');

    settle();
    expect(garrison()).toBe('18,500');
    // The button flash is short lived; it is over by the time the counters settle.
    expect(button('徵募兵卒')?.className).not.toContain('is-fired');
    // The treasury ends on the figure the engine charged for the order.
    const spend = Number(spendChip.replace(/[^0-9]/g, ''));
    expect(spend).toBeGreaterThan(0);
    expect(treasury()[0]).toBe((4200 - spend).toLocaleString('zh-TW'));
    // And the map label follows the panel.
    const capital = document.querySelectorAll('.city-troops .animated-number-value')[14];
    expect(capital.textContent).toBe('1.9萬');
  });

  it('advances the date and restores the command points when a turn ends', () => {
    vi.useFakeTimers();
    startCampaign();
    fireEvent.click(button('徵募兵卒')!);
    settle();
    expect(commandPoints()).toBe('2');

    fireEvent.click(document.querySelector('.end-turn')!);
    settle();

    expect(document.querySelector('.date-block span')?.textContent).toContain('第 2 回合');
    expect(commandPoints()).toBe('3');
    expect(document.querySelector('.latest-report p')?.textContent?.length).toBeGreaterThan(0);
  });

  it('leaves every map label on the figure the engine holds', () => {
    vi.useFakeTimers();
    startCampaign();
    fireEvent.click(button('徵募兵卒')!);
    settle();
    fireEvent.click(document.querySelector('.end-turn')!);
    settle();

    const saved = savedGame();
    const labels = display('.city-troops .animated-number-value');
    expect(labels).toHaveLength(saved.cities.length);
    saved.cities.forEach((city, index) => {
      expect(labels[index]).toBe(compact(city.troops));
    });
    // The differences that came with the turn are gone by now.
    expect(document.querySelectorAll('.delta-chip')).toHaveLength(0);
  });

  it('does not float stale differences when a new campaign replaces the old one', () => {
    vi.useFakeTimers();
    startCampaign();
    fireEvent.click(button('徵募兵卒')!);
    settle();
    fireEvent.click(document.querySelector('.end-turn')!);
    settle();
    expect(treasury()[0]).not.toBe('4,200');

    fireEvent.click(button('新局')!);
    settle(600);
    fireEvent.click(button('選擇新勢力')!);
    settle(600);
    fireEvent.click(document.querySelector('.setup-dialog .gold-button')!);

    // Checked before any timer runs: replacing a campaign must not look like a
    // value change, or every counter would claim a difference it never had.
    expect(document.querySelectorAll('.delta-chip')).toHaveLength(0);
    expect(treasury()[0]).not.toBeNull();

    settle();
    expect(document.querySelectorAll('.delta-chip')).toHaveLength(0);
    expect(treasury()).toEqual(['4,200', '18,000', '36,000']);
    expect(commandPoints()).toBe('3');
  });

  it('runs without a Web Audio implementation and counts the full roster', () => {
    vi.useFakeTimers();
    // jsdom ships no AudioContext, which is exactly the fallback path the game
    // has to survive: the sound layer must not break play.
    expect((window as unknown as { AudioContext?: unknown }).AudioContext).toBeUndefined();
    startCampaign();
    fireEvent.click(document.querySelector('.icon-button[aria-pressed]')!);
    settle(600);
    expect(document.querySelector('.status-bar output')).not.toBeNull();

    fireEvent.click(button('武將')!);
    expect(document.querySelectorAll('.officer-card')).toHaveLength(36);
    expect(document.querySelector('.officer-view .eyebrow')?.textContent).toContain('108');

    fireEvent.click(document.querySelector('.roster-controls [data-slot=select-trigger]')!);
    const all = Array.from(document.querySelectorAll('[data-slot=select-item]')).find((item) =>
      item.textContent?.includes('天下群英'),
    );
    fireEvent.click(all!);
    expect(document.querySelectorAll('.officer-card')).toHaveLength(108);
  });

  it('restores the campaign that was saved in the browser', () => {
    vi.useFakeTimers();
    startCampaign();
    fireEvent.click(button('徵募兵卒')!);
    settle();
    const savedTurn = savedGame().turn;

    cleanup();
    render(<Game />);

    expect(document.querySelector('.setup-dialog')).toBeNull();
    expect(document.querySelector('.status-bar output')?.textContent).toContain('接續');
    expect(savedGame().turn).toBe(savedTurn);
    expect(document.querySelectorAll('.city')).toHaveLength(15);
  });
});
