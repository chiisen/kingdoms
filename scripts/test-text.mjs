import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as OpenCC from 'opencc-js';
import { buildSearchForms } from './build-search-forms.mjs';

/* The interface is Traditional Chinese. This guard converts every source file
   back with OpenCC (cn -> tw): if the result differs, the file still contains
   Simplified text. It is the cheap half of the localisation check, and it also
   catches a Simplified string pasted into a new feature later on. */

const convert = OpenCC.Converter({ from: 'cn', to: 'tw' });

/* OpenCC prefers 徵 where Taiwan keeps 征 (征戰, 出征, 征討, 征伐, 征服, 征程).
   These are correct Traditional forms, so the comparison undoes that one rule;
   the wrong direction is rejected by its own check below. */
const KEEP_ZHENG = [
  ['徵戰', '征戰'],
  ['出徵', '出征'],
  ['徵討', '征討'],
  ['徵伐', '征伐'],
  ['徵服', '征服'],
  ['徵程', '征程'],
];

function normalise(text) {
  return KEEP_ZHENG.reduce((result, [from, to]) => result.split(from).join(to), text);
}

/** Spacing is decorative in places (「起 兵 出 征」), so compare without it. */
const strip = (text) => text.replace(/\s+/g, '');

const FILES = [
  'index.html',
  'src/game/Game.tsx',
  'src/game/engine.ts',
  'src/game/officers.ts',
  'src/game/audio.ts',
  'src/components/AnimatedNumber.tsx',
  'src/components/ui/modal.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/alert-dialog.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/slider.tsx',
  'src/components/ui/tabs.tsx',
  'src/components/ui/input.tsx',
];

test('interface sources contain no Simplified Chinese', () => {
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');
    // Compare per line without spacing: decorative spaces (「起 兵 出 征」) break
    // OpenCC's phrase matching, so its output has to be normalised after that.
    const before = source.split('\n').map(strip);
    const converted = convert(source).split('\n').map((line) => normalise(strip(line)));
    const line = before.findIndex((text, index) => text !== converted[index]);
    if (line < 0) continue;
    assert.fail(
      `${file}:${line + 1} still uses Simplified text\n  now: ${source.split('\n')[line].trim()}\n  expected: ${converted[line]}`,
    );
  }
});

test('the levy character is only used for recruiting, never for marching', () => {
  // 徵 means to summon (徵兵, 徵募); marching keeps 征 (出征, 征戰). OpenCC's
  // Taiwan table over-applies 徵, which is how 「起兵出徵」 slipped in once.
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');
    for (const [wrong, right] of KEEP_ZHENG) {
      assert(
        !source.includes(wrong),
        `${file} uses ${wrong}; Traditional Chinese keeps 征 there (${right})`,
      );
    }
  }
});

test('the Simplified search forms match the roster', async () => {
  // The roster search accepts either script by keeping a Simplified record
  // beside the Traditional text; that record has to be regenerated with the data.
  const normaliseEndings = (text) => text.replace(/\r\n/g, '\n');
  const committed = readFileSync('src/game/search-forms.ts', 'utf8');
  const generated = await buildSearchForms();
  assert.equal(
    normaliseEndings(committed),
    normaliseEndings(generated),
    'run `node scripts/build-search-forms.mjs` to refresh src/game/search-forms.ts',
  );
});

test('no officer is missing a Simplified spelling of a different character', async () => {
  const bundle = readFileSync('src/game/search-forms.ts', 'utf8');
  const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
  // Spot checks that matter most: names whose every character differs.
  for (const [traditional, simplified] of [
    ['諸葛亮', '诸葛亮'],
    ['趙雲', '赵云'],
    ['張飛', '张飞'],
    ['龐統', '庞统'],
    ['黃蓋', '黄盖'],
  ]) {
    assert.equal(toSimplified(traditional), simplified, `${traditional} -> ${simplified}`);
    assert(bundle.includes(simplified), `${simplified} is missing from the search forms`);
  }
});

test('the game text is not left in Simplified form anywhere in the bundle entry', async () => {
  // A quick sanity check on a few strings that differ between the two scripts.
  const game = readFileSync('src/game/Game.tsx', 'utf8');
  const engine = readFileSync('src/game/engine.ts', 'utf8');
  const officers = readFileSync('src/game/officers.ts', 'utf8');
  const all = `${game}\n${engine}\n${officers}`;

  for (const word of ['武將', '軍糧', '圖鑑', '徵募兵卒', '開墾農田', '諸葛亮', '趙雲']) {
    assert(all.includes(word), `expected the Traditional form ${word}`);
  }
  for (const word of ['武将', '军粮', '图鉴', '征募兵卒', '开垦农田', '诸葛亮', '赵云']) {
    assert(!all.includes(word), `found the Simplified form ${word}`);
  }
});
