import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Map,
  Users,
  ScrollText,
  HelpCircle,
  Flag,
  Coins,
  Wheat,
  Castle,
  Swords,
  Shield,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Save,
  RotateCcw,
  Check,
  Compass,
  Sun,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Maximize,
  Minimize,
  Plus,
  Minus,
  LocateFixed,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import * as E from './engine';
import Portrait from './Portrait';
import AnimatedNumber, {
  useOwnerChanges,
  useValueDelta,
} from '@/components/AnimatedNumber';
import {
  playSfx,
  readStoredSound,
  setSoundEnabled,
  stopMusic,
  unlockAudio,
  type SfxName,
} from './audio';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { Game as State, Playable, Action } from './engine';
const fmt = (n: number) => Math.round(n).toLocaleString('zh-CN');
const compact = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}萬` : fmt(n);
const icons = {
  farm: Wheat,
  market: TrendingUp,
  recruit: Users,
  train: Swords,
  wall: Shield,
};
const terrain = `${import.meta.env.BASE_URL}terrain.jpg`;
const gameFileName = '三分天下-存檔.json';

/** Picks the sound for what a turn actually resolved to. */
function outcomeSfx(before: State, after: State): SfxName {
  if (after.status === 'won') return 'win';
  if (after.status === 'lost') return 'lose';
  const added = after.logs.slice(
    0,
    Math.max(0, after.logs.length - before.logs.length),
  );
  if (added.some((entry) => entry.text.includes('攻克'))) return 'capture';
  if (added.some((entry) => entry.text.includes('失利'))) return 'clash';
  return 'click';
}
export default function Game() {
  const [g, setG] = useState<State>(() => E.newGame());
  const [query, setQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState('mine');
  const [detail, setDetail] = useState<E.Officer | null>(null);
  const [administrator, setAdministrator] = useState('auto');
  const [selected, setSelected] = useState('chengdu');
  const [view, setView] = useState('map');
  const [setup, setSetup] = useState(false);
  const [faction, setFaction] = useState<Playable>('shu');
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(false);
  const [restart, setRestart] = useState(false);
  const [attack, setAttack] = useState(false);
  const [target, setTarget] = useState('');
  const [requestedTroops, setTroops] = useState(8000);
  const [officer, setOfficer] = useState('guan');
  const [notice, setNotice] = useState('先發展城池，再率軍逐鹿天下。');
  const [saving, setSaving] = useState('本地自動存檔');
  const [sound, setSound] = useState(() => readStoredSound());
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const [fired, setFired] = useState('');
  // Bumped whenever a whole campaign is replaced (new game, restore, import) so
  // the counters remount instead of counting up from the previous campaign.
  const [campaign, setCampaign] = useState(0);
  const imported = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const shell = useRef<HTMLDivElement>(null);
  const mapScroll = useRef<HTMLDivElement>(null);
  // Hydration and save feedback synchronize with browser-only local storage.
  /* eslint-disable react/react-compiler */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(E.STORAGE_KEY);
      if (raw) {
        const saved = E.loadGame(raw);
        setG(saved);
        setFaction(saved.player);
        setAdministrator('auto');
        setSelected(E.owned(saved, saved.player)[0]?.id || 'chengdu');
        setNotice('已接續上次戰局。');
        setCampaign((n) => n + 1);
      } else setSetup(true);
    } catch {
      setSetup(true);
      setSaving('存檔不可用，可手動匯出');
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || setup) return;
    try {
      localStorage.setItem(E.STORAGE_KEY, JSON.stringify(g));
      setSaving('進度已自動保存');
    } catch {
      setSaving('請匯出存檔保存進度');
    }
  }, [g, ready, setup]);
  /* eslint-enable react/react-compiler */
  useEffect(() => {
    const onFull = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFull);
    return () => document.removeEventListener('fullscreenchange', onFull);
  }, []);
  // The score may only start from a user gesture, so the first click or key
  // press after loading unlocks the audio graph.
  useEffect(() => {
    if (!ready || !sound) {
      stopMusic();
      return;
    }
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ready, sound]);
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) stopMusic();
      else if (sound) unlockAudio();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [sound]);
  function toggleSound() {
    const next = !sound;
    if (next) {
      setSoundEnabled(true);
      unlockAudio();
      playSfx('confirm');
    } else {
      playSfx('close');
      setSoundEnabled(false);
    }
    setSound(next);
  }
  const city = E.getCity(g, selected);
  const mine = city.owner === g.player;
  const me = E.FACTIONS[g.player];
  const resources = g.resources[g.player];
  const income = E.income(g);
  const myCities = E.owned(g, g.player);
  const totalTroops =
    myCities.reduce((n, c) => n + c.troops, 0) +
    g.armies
      .filter((a) => a.owner === g.player)
      .reduce((n, a) => n + a.troops, 0);
  const visibleOfficers = (
    rosterFilter === 'mine'
      ? me.officers
      : rosterFilter === 'all'
        ? E.ALL_OFFICERS
        : E.FACTIONS[rosterFilter as Playable].officers
  ).filter((o) => `${o.name}${o.role}${o.specialty}`.includes(query.trim()));
  const available = me.officers.filter((o) => E.officerAvailable(g, o.id));
  const targets = E.neighbors(selected).map((id) => E.getCity(g, id));
  const targetCity = g.cities.find((c) => c.id === target);
  const changedCities = useOwnerChanges(g.cities.map((city) => city.owner));
  const chosenOfficer = E.getOfficer(officer);
  const marchLimit = Math.max(
    1000,
    Math.floor(
      Math.min(
        city.troops - 1000,
        chosenOfficer ? E.leaderCapacity(chosenOfficer) : 1000,
      ) / 500,
    ) * 500,
  );
  const troops = Math.max(1000, Math.min(requestedTroops, marchLimit));
  const forecast =
    targetCity && mine ? E.predict(g, selected, target, troops, officer) : null;
  function update(
    fn: (state: State) => State,
    success: string,
    effect: SfxName = 'order',
  ) {
    if (lock.current) return;
    lock.current = true;
    try {
      const next = fn(g);
      setG(next);
      setNotice(success);
      playSfx(effect);
    } catch (error) {
      setNotice((error as Error).message);
      playSfx('error');
    } finally {
      lock.current = false;
    }
  }
  function start() {
    setAdministrator('auto');
    const fresh = E.newGame(faction);
    setG(fresh);
    setSelected(E.FACTIONS[faction].capital);
    setView('map');
    setSetup(false);
    setNotice('建議：徵募兵卒 → 選擇相鄰城池出征 → 結束回合。');
    setCampaign((n) => n + 1);
    unlockAudio();
    playSfx('confirm');
  }
  function openMarch(destination?: string) {
    const origin = E.getCity(g, selected);
    if (origin.owner !== g.player) return;
    playSfx('open');
    setTarget(
      destination ||
        E.neighbors(selected).find(
          (id) => E.getCity(g, id).owner !== g.player,
        ) ||
        E.neighbors(selected)[0],
    );
    setOfficer(
      available.slice().sort((a, b) => E.combatSkill(b) - E.combatSkill(a))[0]
        ?.id || '',
    );
    setTroops(
      Math.max(
        1000,
        Math.floor(
          Math.min(origin.troops - 1000, origin.troops * 0.75) / 1000,
        ) * 1000,
      ),
    );
    setAttack(true);
  }
  function nextTurn() {
    if (lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    playSfx('turn');
    setTimeout(() => {
      try {
        const next = E.endTurn(g);
        setG(next);
        setNotice(
          next.status === 'playing'
            ? `第 ${next.turn} 回合開始。請查看下方戰報。`
            : next.status === 'won'
              ? '天下一統！你的征程已載入史冊。'
              : '最後一城失守，可另啟新局再戰。',
        );
        playSfx(outcomeSfx(g, next));
      } catch (error) {
        setNotice((error as Error).message);
        playSfx('error');
      } finally {
        setBusy(false);
        lock.current = false;
      }
    }, 420);
  }
  function exportSave() {
    playSfx('coin');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(g, null, 2)], { type: 'application/json' }),
    );
    a.download = gameFileName;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice('存檔已匯出，可在其他瀏覽器中匯入。');
  }
  async function importSave(file?: File) {
    if (!file) return;
    try {
      const saved = E.loadGame(await file.text());
      setG(saved);
      setFaction(saved.player);
      setAdministrator('auto');
      setSelected(E.owned(saved, saved.player)[0]?.id || 'chengdu');
      setNotice('存檔已載入。');
      setCampaign((n) => n + 1);
      playSfx('confirm');
      setHelp(false);
    } catch (error) {
      setNotice((error as Error).message);
      playSfx('error');
    }
    if (imported.current) imported.current.value = '';
  }
  function selectCity(id: string) {
    setSelected(id);
    setAdministrator('auto');
    playSfx('select');
  }
  function fire(name: string) {
    setFired(name);
    window.setTimeout(
      () => setFired((current) => (current === name ? '' : current)),
      760,
    );
  }
  const actionDisabled = (type: Action) =>
    E.actionError(g, type, selected, g.player, g.ap, administrator) || busy;
  return (
    <div className="game-shell" ref={shell}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-seal">
            三<br />國
          </span>
          <div>
            <h1>三分天下</h1>
            <span>群 雄 逐 鹿</span>
          </div>
        </div>
        <div className="top-divider" />
        <div className="ruler">
          <Portrait officer={me.officers[0]} className="ruler-avatar" />
          <span
            className="mini-seal"
            style={{ color: me.color, borderColor: me.color }}
          >
            {me.seal}
          </span>
          <div>
            <strong>{me.name}勢力</strong>
            <small>{me.title}</small>
          </div>
        </div>
        <div className="treasury">
          <div>
            <Coins />
            <span>
              <small>金錢</small>
              <strong>
                <AnimatedNumber key={`gold-${campaign}`} value={resources.gold} />
              </strong>
            </span>
            <em>+{fmt(income.gold)}</em>
          </div>
          <div>
            <Wheat />
            <span>
              <small>軍糧</small>
              <strong>
                <AnimatedNumber key={`food-${campaign}`} value={resources.food} />
              </strong>
            </span>
            <em>
              {income.food >= 0 ? '+' : ''}
              {fmt(income.food)}
            </em>
          </div>
          <div className="troop-total">
            <Users />
            <span>
              <small>總兵力</small>
              <strong>
                <AnimatedNumber key={`troops-${campaign}`} value={totalTroops} />
              </strong>
            </span>
          </div>
        </div>
        <button
          className="icon-button"
          aria-label={sound ? '關閉音效與配樂' : '開啟音效與配樂'}
          title={sound ? '關閉音效與配樂' : '開啟音效與配樂'}
          aria-pressed={sound}
          onClick={toggleSound}
        >
          {sound ? <Volume2 /> : <VolumeX />}
        </button>
        <button
          className="icon-button help-icon"
          aria-label="玩法與存檔"
          title="玩法與存檔"
          onClick={() => {
            playSfx('open');
            setHelp(true);
          }}
        >
          <HelpCircle />
        </button>
      </header>
      <div className="game-body">
        <nav className="rail" aria-label="遊戲視圖">
          {[
            ['map', '天下', Map],
            ['officers', '武將', Users],
            ['chronicle', '戰報', ScrollText],
          ].map(([id, label, Icon]) => {
            const I = Icon as typeof Map;
            return (
              <button
                key={id as string}
                className={view === id ? 'active' : ''}
                onClick={() => {
                  playSfx('click');
                  setView(id as string);
                }}
                aria-label={label as string}
              >
                <I />
                <span>{label as string}</span>
              </button>
            );
          })}
          <div className="rail-spacer" />
          <button onClick={exportSave} aria-label="匯出存檔">
            <Save />
            <span>存檔</span>
          </button>
          <button
            onClick={() => {
              playSfx('open');
              setRestart(true);
            }}
            aria-label="另啟新局"
          >
            <RotateCcw />
            <span>新局</span>
          </button>
          <span className="rail-bottom">建安十三年</span>
        </nav>
        <main className="world">
          <div className="world-head">
            <div>
              <span className="eyebrow">天下大勢</span>
              <h2>
                {view === 'map'
                  ? '江山如畫'
                  : view === 'officers'
                    ? '帳下群英'
                    : '征戰紀事'}
              </h2>
            </div>
            <div className="scenario">
              <span className="live-dot" /> 英雄集結{' '}
              <span className="scenario-sep">/</span>
              <span>自由推演</span>
            </div>
          </div>
          <div
            className={`map-viewport ${view === 'map' ? '' : 'map-hidden'}`}
            ref={mapScroll}
          >
            <div
              className="world-map"
              style={{
                width: `${zoom * 100}%`,
                height: `${zoom * 100}%`,
                backgroundImage: `url(${terrain})`,
              }}
            >
              <div className="map-shade" />
              <span className="region region-west">益 州</span>
              <span className="region region-north">司 隸</span>
              <span className="region region-east">揚 州</span>
              <span className="region region-center">荊 州</span>
              <svg
                className="road-map"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {E.ROADS.map(([a, b]) => {
                  const c = E.getCity(g, a),
                    d = E.getCity(g, b),
                    highlight = selected === a || selected === b;
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={c.x}
                      y1={c.y}
                      x2={d.x}
                      y2={d.y}
                      className={highlight ? 'road active-road' : 'road'}
                    />
                  );
                })}
                {g.armies.map((a) => {
                  const c = E.getCity(g, a.from),
                    d = E.getCity(g, a.to);
                  return (
                    <line
                      key={a.id}
                      x1={c.x}
                      y1={c.y}
                      x2={d.x}
                      y2={d.y}
                      className="march-road"
                      style={{ stroke: E.FACTIONS[a.owner].color }}
                    />
                  );
                })}
              </svg>
              {g.cities.map((c, index) => (
                <button
                  key={c.id}
                  className={`city ${c.id === selected ? 'selected' : ''} ${c.owner === g.player ? 'owned' : ''} ${changedCities.includes(index) ? 'just-changed' : ''}`}
                  style={
                    {
                      left: `${c.x}%`,
                      top: `${c.y}%`,
                      '--faction': E.FACTIONS[c.owner].color,
                    } as CSSProperties
                  }
                  onClick={() => selectCity(c.id)}
                  aria-label={`${c.name}，${E.FACTIONS[c.owner].name}勢力，駐軍${fmt(c.troops)}`}
                  aria-pressed={c.id === selected}
                >
                  <span className="city-halo" />
                  <span className="city-pin">
                    <Castle size={20} />
                  </span>
                  <span className="city-banner">
                    <i>{E.FACTIONS[c.owner].seal}</i>
                    <strong>{c.name}</strong>
                  </span>
                  <CityTroops key={`${c.id}-${campaign}`} troops={c.troops} />
                </button>
              ))}
              {g.armies.map((a) => {
                const c = E.getCity(g, a.from),
                  d = E.getCity(g, a.to);
                return (
                  <div
                    className="march-token"
                    key={a.id}
                    style={{
                      left: `${(c.x + d.x) / 2}%`,
                      top: `${(c.y + d.y) / 2}%`,
                      color: E.FACTIONS[a.owner].color,
                    }}
                    title={`${compact(a.troops)}兵向${d.name}行軍`}
                  >
                    <Flag size={16} />
                    <span>{compact(a.troops)}</span>
                  </div>
                );
              })}
              <div className="compass">
                <Compass />
                <span>北</span>
              </div>
            </div>
          </div>
          {view === 'map' && (
            <>
              <div className="map-caption">
                <span className="caption-line" />
                建安十三年 · 風雲初起<small>選擇城池，運籌帷幄</small>
              </div>
              <div className="map-tools">
                <button
                  aria-label="放大地圖"
                  disabled={zoom >= 1.8}
                  onClick={() => {
                    playSfx('click');
                    setZoom(Math.min(1.8, zoom + 0.2));
                  }}
                >
                  <Plus />
                </button>
                <button
                  aria-label="縮小地圖"
                  disabled={zoom <= 1}
                  onClick={() => {
                    playSfx('click');
                    setZoom(Math.max(1, zoom - 0.2));
                  }}
                >
                  <Minus />
                </button>
                <button
                  aria-label="重置地圖視野"
                  onClick={() => {
                    playSfx('click');
                    setZoom(1);
                    mapScroll.current?.scrollTo(0, 0);
                  }}
                >
                  <LocateFixed />
                </button>
                <button
                  aria-label={full ? '退出全屏' : '全屏遊戲'}
                  onClick={() => {
                    playSfx('click');
                    if (document.fullscreenElement)
                      void document.exitFullscreen();
                    else
                      void shell.current
                        ?.requestFullscreen?.()
                        .catch(() =>
                          setNotice('此瀏覽器不支持全屏，可使用窗口最大化。'),
                        );
                  }}
                >
                  {full ? <Minimize /> : <Maximize />}
                </button>
              </div>
            </>
          )}
          {view === 'officers' && (
            <section className="officer-view">
              <div className="roster-heading">
                <div>
                  <span className="eyebrow">百將風雲 · 108 人圖鑑</span>
                  <p className="section-intro">
                    統率領軍，武力破陣，智略濟世。
                  </p>
                </div>
                <span className="roster-count">
                  {visibleOfficers.length}
                  <small> 位武將</small>
                </span>
              </div>
              <div className="roster-controls">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋姓名、定位或專長"
                  aria-label="搜尋武將"
                />
                <Select
                  value={rosterFilter}
                  onValueChange={(v) => setRosterFilter(v || 'mine')}
                >
                  <SelectTrigger className="game-select">
                    <SelectValue>
                      {
                        {
                          mine: '我方武將',
                          all: '天下群英',
                          wei: '曹操勢力',
                          shu: '劉備勢力',
                          wu: '孫權勢力',
                        }[rosterFilter]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries({
                      mine: '我方武將',
                      all: '天下群英',
                      wei: '曹操勢力',
                      shu: '劉備勢力',
                      wu: '孫權勢力',
                    }).map(([v, t]) => (
                      <SelectItem key={v} value={v}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="officer-grid">
                {visibleOfficers.map((o) => (
                  <button
                    className="officer-card"
                    key={o.id}
                    onClick={() => {
                      playSfx('select');
                      setDetail(o);
                    }}
                    aria-label={`查看${o.name}，統率${o.command}，武力${o.war}，智略${o.int}`}
                  >
                    <div className="officer-portrait">
                      <Portrait officer={o} />
                      <small>{o.specialty}</small>
                    </div>
                    <div className="officer-card-info">
                      <span
                        className="eyebrow"
                        style={{ color: E.FACTIONS[o.faction].color }}
                      >
                        {E.FACTIONS[o.faction].name} · {o.role}
                      </span>
                      <h3>{o.name}</h3>
                      <div className="officer-stats">
                        <span>
                          統 <b>{o.command}</b>
                        </span>
                        <span>
                          武 <b>{o.war}</b>
                        </span>
                        <span>
                          智 <b>{o.int}</b>
                        </span>
                      </div>
                      <p
                        className={
                          E.officerAvailable(g, o.id) ? 'available' : 'away'
                        }
                      >
                        <span className="live-dot" />
                        {g.armies.some((a) => a.officer === o.id)
                          ? '領軍出征'
                          : E.officerAvailable(g, o.id)
                            ? '本陣待命'
                            : `休整 ${E.restRemaining(g, o.id)} 回合`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {!visibleOfficers.length && (
                <div className="roster-empty">
                  沒有找到對應武將，試試其他姓名或勢力。
                </div>
              )}
              <div className="note-panel">
                <Flag />
                <p>
                  統率決定帶兵上限；戰力綜合統率45%、武力35%、智略20%。智略還能節省行軍軍糧和內政金錢。執行一次指令後，下回合休整，再下一回合可用。
                </p>
              </div>
            </section>
          )}
          {view === 'chronicle' && (
            <section className="chronicle-view">
              {g.logs.map((l) => (
                <div className={`chronicle-item ${l.kind}`} key={l.id}>
                  <span>第 {l.turn} 回合</span>
                  <i />
                  <p>{l.text}</p>
                </div>
              ))}
            </section>
          )}
          <div className="world-bottom">
            <div className="legend">
              {(['wei', 'shu', 'wu', 'qun'] as const).map((f) => (
                <span key={f}>
                  <i style={{ background: E.FACTIONS[f].color }} />
                  {E.FACTIONS[f].name}
                  <LegendCount
                    key={`${f}-${campaign}`}
                    count={E.owned(g, f).length}
                  />
                </span>
              ))}
            </div>
            <span className="map-note">戰略示意圖</span>
          </div>
        </main>
        <aside className="city-panel">
          <div className="city-panel-title">
            <span className="eyebrow">城 池 情 報</span>
            <span className={`ownership ${mine ? 'friendly' : ''}`}>
              {mine
                ? '我方領地'
                : city.owner === 'qun'
                  ? '群雄割據'
                  : '敵方領地'}
            </span>
          </div>
          <div className="city-name-row">
            <div>
              <h2>{city.name}</h2>
              <p>
                <Flag size={13} /> {E.FACTIONS[city.owner].name}勢力
                {city.occupation > 0 && (
                  <span className="occupation">安民中 · 產出減半</span>
                )}
              </p>
            </div>
            <div
              className="city-emblem"
              style={{ color: E.FACTIONS[city.owner].color }}
            >
              <Castle size={36} />
            </div>
          </div>
          <div className="garrison">
            <div>
              <span>城池駐軍</span>
              <strong>
                <AnimatedNumber key={city.id} value={city.troops} />
                <small>兵</small>
              </strong>
            </div>
            <Users />
          </div>
          <div className="city-stats">
            <Stat key={`${city.id}-morale`} label="士氣" value={city.morale} />
            <Stat key={`${city.id}-wall`} label="城防" value={city.wall} />
            <div className="economy-row">
              <ValueFlash key={`${city.id}-farm`} value={city.farm}>
                <Wheat />
                農業 <b>Lv.{city.farm}</b>
              </ValueFlash>
              <ValueFlash key={`${city.id}-market`} value={city.market}>
                <Coins />
                商業 <b>Lv.{city.market}</b>
              </ValueFlash>
            </div>
          </div>
          <div className="command-title">
            <h3>{mine ? '城池指令' : '城池概況'}</h3>
            <span>{mine ? '每次消耗 1 政令' : '沿道路進軍此城'}</span>
          </div>
          {mine && (
            <div className="advisor-picker">
              <label htmlFor="administrator-select">執行武將</label>
              <Select
                value={administrator}
                onValueChange={(v) => setAdministrator(v || 'auto')}
              >
                <SelectTrigger
                  id="administrator-select"
                  className="game-select"
                >
                  <SelectValue>
                    {administrator === 'auto'
                      ? '自動擇優任命'
                      : E.getOfficer(administrator)?.name || '選擇武將'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自動擇優任命</SelectItem>
                  {available.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <Portrait officer={o} className="option-avatar" />
                      {o.name} · 智 {o.int}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mine ? (
            <div className="actions">
              {(Object.keys(E.ACTIONS) as Action[]).map((type) => {
                const a = E.ACTIONS[type],
                  Icon = icons[type],
                  error = actionDisabled(type),
                  quote = E.actionQuote(
                    g,
                    type,
                    selected,
                    g.player,
                    administrator,
                  );
                return (
                  <button
                    className={cn('action-button', fired === type && 'is-fired')}
                    disabled={!!error}
                    title={
                      typeof error === 'string'
                        ? error
                        : `${a.description} · ${quote.officer?.name || '無可用武將'}執行 · 智略減費${quote.discount}%`
                    }
                    key={type}
                    onClick={() => {
                      fire(type);
                      update(
                        (s) => E.act(s, type, selected, administrator),
                        `${quote.officer?.name}執行：${a.description}，休整至第${g.turn + 2}回合。`,
                        type === 'recruit' ? 'muster' : 'order',
                      );
                    }}
                  >
                    <span className="action-icon">
                      <Icon size={18} />
                    </span>
                    <span>
                      <strong>{a.name}</strong>
                      <small>
                        {quote.officer?.name || '等待武將'} ·{' '}
                        {type === 'farm'
                          ? '農業 +1'
                          : type === 'market'
                            ? '商業 +1'
                            : type === 'recruit'
                              ? '兵 +2,500'
                              : type === 'train'
                                ? '士氣 +12'
                                : '城防 +12'}
                      </small>
                    </span>
                    <span className="action-cost">
                      {quote.gold}
                      <Coins size={12} />
                    </span>
                  </button>
                );
              })}
              <button
                className={cn('march-button', fired === 'march' && 'is-fired')}
                disabled={
                  g.ap < 1 ||
                  city.troops < 2000 ||
                  !available.length ||
                  g.status !== 'playing' ||
                  busy
                }
                onClick={() => {
                  fire('march');
                  openMarch();
                }}
              >
                <Swords size={18} /> 調兵出征 <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div className="enemy-actions">
              <p>從相鄰的己方城池派遣軍隊，戰勝守軍即可佔領。</p>
              {myCities
                .filter((c) => E.neighbors(c.id).includes(selected))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      playSfx('open');
                      const destination = selected;
                      setSelected(c.id);
                      setTarget(destination);
                      const best = available
                        .slice()
                        .sort((a, b) => E.combatSkill(b) - E.combatSkill(a))[0];
                      setOfficer(best?.id || '');
                      setTroops(
                        Math.max(
                          1000,
                          Math.floor(((c.troops - 1000) * 0.8) / 1000) * 1000,
                        ),
                      );
                      setAttack(true);
                    }}
                  >
                    <Swords size={17} />
                    <span>從{c.name}出征</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              {!myCities.some((c) => E.neighbors(c.id).includes(selected)) && (
                <small>尚無相鄰的己方城池，需先打通道路。</small>
              )}
            </div>
          )}
          <div className="domination">
            <div>
              <span>天下歸心</span>
              <b>
                <AnimatedNumber key={`cities-${campaign}`} value={myCities.length} />
                <small> / 15 城</small>
              </b>
            </div>
            <div className="domination-track">
              <i style={{ width: `${(myCities.length / 15) * 100}%` }} />
            </div>
            <p>佔領全部城池，即可一統天下</p>
          </div>
        </aside>
      </div>
      <footer className="command-bar">
        <div className="date-block">
          <Sun />
          <div>
            <strong>{E.dateLabel(g.turn)}</strong>
            <span>
              第 {g.turn} 回合 ·{' '}
              {
                [
                  '春',
                  '春',
                  '春',
                  '夏',
                  '夏',
                  '夏',
                  '秋',
                  '秋',
                  '秋',
                  '冬',
                  '冬',
                  '冬',
                ][(g.turn - 1) % 12]
              }
            </span>
          </div>
        </div>
        <div className="latest-report">
          <span>
            <ScrollText size={14} /> 軍 情
          </span>
          <p
            key={g.logs[0]?.id ?? 0}
            className={g.logs.length ? 'is-new' : ''}
            title={g.logs[0]?.text}
          >
            {g.logs.find((l) => l.kind === 'war')?.text || g.logs[0]?.text}
          </p>
        </div>
        <div className="ap-block">
          <span>
            剩餘政令{' '}
            <b>
              <AnimatedNumber
                key={`ap-${campaign}`}
                value={g.ap}
                format={(n) => `${Math.round(n)}`}
              />
              <small> / {E.maxAP(g)}</small>
            </b>
          </span>
          <div key={`${g.ap}-${E.maxAP(g)}`}>
            {Array.from({ length: E.maxAP(g) }, (_, i) => (
              <i
                key={i}
                className={i < g.ap ? 'filled' : ''}
                style={{ '--pip': i } as CSSProperties}
              />
            ))}
          </div>
        </div>
        <button
          className="end-turn"
          disabled={busy || setup || g.status !== 'playing'}
          onClick={nextTurn}
        >
          <span>{busy ? '戰局推演中…' : '結束回合'}</span>
          <ChevronRight size={20} />
        </button>
      </footer>
      <div className="status-bar">
        <output aria-live="polite">{notice}</output>
        <span>
          <Check size={12} />
          {saving}
        </span>
      </div>
      <Dialog
        open={setup}
        onOpenChange={(open) => {
          playSfx(open ? 'open' : 'close');
          setSetup(open);
        }}
      >
        <DialogContent
          className="game-dialog setup-dialog"
          showCloseButton={false}
        >
          <div className="setup-top">
            <span className="eyebrow">建安十三年 · 英雄集結</span>
            <DialogTitle>逐鹿天下</DialogTitle>
            <DialogDescription>
              山河未定，英雄並起。擇一方勢力，書寫你的三國。
            </DialogDescription>
          </div>
          <div className="faction-options">
            {E.PLAYABLE.map((f) => (
              <button
                key={f}
                className={f === faction ? 'chosen' : ''}
                style={{ '--faction': E.FACTIONS[f].color } as CSSProperties}
                onClick={() => {
                  playSfx('select');
                  setFaction(f);
                }}
                aria-pressed={f === faction}
              >
                <Portrait
                  officer={E.FACTIONS[f].officers[0]}
                  className="faction-portrait"
                />
                <h3>{E.FACTIONS[f].name}</h3>
                <small>{E.FACTIONS[f].title}</small>
                <p>{E.FACTIONS[f].desc}</p>
                <span className="faction-choice">
                  {f === faction ? (
                    <>
                      <Check size={14} />
                      已選擇
                    </>
                  ) : (
                    '選擇勢力'
                  )}
                </span>
              </button>
            ))}
          </div>
          <button className="gold-button" onClick={start}>
            起 兵 出 徵 <ArrowRight size={18} />
          </button>
          <p className="setup-footnote">108 位名將 · 原創頭像 · 三方均衡開局</p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={attack}
        onOpenChange={(open) => {
          playSfx(open ? 'open' : 'close');
          setAttack(open);
        }}
      >
        <DialogContent className="game-dialog march-dialog">
          <DialogTitle>
            <Swords size={22} /> 調兵出征
          </DialogTitle>
          <DialogDescription>
            由{city.name}出發，結束本回合後抵達。出征消耗 1 政令。
          </DialogDescription>
          <label className="field-label" htmlFor="march-target">
            目標城池
          </label>
          <Select value={target} onValueChange={(v) => setTarget(v || '')}>
            <SelectTrigger id="march-target" className="game-select">
              <SelectValue>
                {targetCity
                  ? `${targetCity.name} · ${targetCity.owner === g.player ? '友軍增援' : E.FACTIONS[targetCity.owner].name + '勢力'} · ${fmt(targetCity.troops)}兵`
                  : '選擇城池'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {targets.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ·{' '}
                  {c.owner === g.player ? '友軍' : E.FACTIONS[c.owner].name} ·{' '}
                  {fmt(c.troops)}兵
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="field-label" htmlFor="march-officer">
            領軍武將
          </label>
          <Select value={officer} onValueChange={(v) => setOfficer(v || '')}>
            <SelectTrigger id="march-officer" className="game-select">
              <SelectValue>
                {available.find((o) => o.id === officer)?.name || '無可用武將'}
                {available.find((o) => o.id === officer)
                  ? ` · 統率 ${available.find((o) => o.id === officer)?.command}`
                  : ''}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {available.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <Portrait officer={o} className="option-avatar" />
                  {o.name} · 統{o.command} 武{o.war} 智{o.int}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {chosenOfficer && (
            <div className="commander-summary">
              <Portrait officer={chosenOfficer} />
              <div>
                <b>{chosenOfficer.name}</b>
                <span>
                  {chosenOfficer.specialty} · {chosenOfficer.role}
                </span>
                <small>
                  帶兵上限 {fmt(E.leaderCapacity(chosenOfficer))} · 軍糧節省{' '}
                  {Math.round(chosenOfficer.int * 0.2)}%
                </small>
              </div>
            </div>
          )}
          <div className="troop-picker">
            <span className="troop-label">出征兵力</span>
            <strong>
              {fmt(troops)}
              <small> 兵</small>
            </strong>
          </div>
          <Slider
            aria-label="出征兵力"
            value={[troops]}
            onValueChange={(v) => setTroops(Array.isArray(v) ? v[0] : v)}
            min={1000}
            max={marchLimit}
            step={500}
            disabled={city.troops < 2000}
          />
          <div className="slider-labels">
            <span>1,000</span>
            <span>留守 {fmt(city.troops - troops)} 兵</span>
          </div>
          {targetCity && (
            <div
              className={`forecast ${targetCity.owner === g.player || forecast?.win ? 'favorable' : 'risky'}`}
            >
              <span>
                {targetCity.owner === g.player
                  ? '友軍增援'
                  : forecast?.win
                    ? '預計勝勢'
                    : '預計失利'}
              </span>
              <strong>
                {targetCity.owner === g.player
                  ? '合兵一處，守望相助'
                  : forecast?.win
                    ? `預計餘部 ${fmt(forecast.survivors)} 兵`
                    : `預計撤回 ${fmt(forecast?.retreat || 0)} 兵`}
              </strong>
              <small>
                軍糧消耗{' '}
                {fmt(chosenOfficer ? E.marchFood(troops, chosenOfficer) : 0)} ·
                政令 1
              </small>
              <p>其他部隊的抵達可能改變最終戰況。</p>
            </div>
          )}
          <button
            className="gold-button"
            disabled={
              !!E.marchError(g, selected, target, troops, officer) || busy
            }
            onClick={() => {
              update(
                (s) => E.march(s, selected, target, troops, officer),
                '軍令已下，部隊將在結束回合後抵達。',
                'march',
              );
              setAttack(false);
            }}
          >
            確認出征 <Flag size={17} />
          </button>
          {E.marchError(g, selected, target, troops, officer) && (
            <p className="form-error">
              {E.marchError(g, selected, target, troops, officer)}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={help}
        onOpenChange={(open) => {
          playSfx(open ? 'open' : 'close');
          setHelp(open);
        }}
      >
        <DialogContent className="game-dialog help-dialog">
          <DialogTitle>軍師錦囊</DialogTitle>
          <DialogDescription>內修政理，外御強敵。</DialogDescription>
          <Tabs defaultValue="rules" onValueChange={() => playSfx('click')}>
            <TabsList>
              <TabsTrigger value="rules">玩法說明</TabsTrigger>
              <TabsTrigger value="saves">存檔管理</TabsTrigger>
            </TabsList>
            <TabsContent value="rules">
              <ol className="rules">
                <li>
                  <b>經營城池</b>
                  <p>
                    金錢與軍糧在回合結束時入庫。發展商貿增加金錢，開墾農田增加軍糧。兵卒每回合消耗軍糧。指定謀士辦理內政可節省至多20%金錢。新占城池連續兩次結算產出減半。
                  </p>
                </li>
                <li>
                  <b>整軍備戰</b>
                  <p>
                    徵兵增加 2,500
                    兵力，會稀釋老兵士氣；練兵與修城各提升12點。3道政令在佔領8城、13城時分別增加至4道、5道。
                  </p>
                </li>
                <li>
                  <b>調兵遣將</b>
                  <p>
                    點擊己方城池，選擇「調兵出征」。只能沿道路進軍相鄰城池，也能向友城增援。至少留守
                    1,000
                    兵，每支部隊受主將統率限制。武將執行軍令後，下回合休整。
                  </p>
                </li>
                <li>
                  <b>推進戰局</b>
                  <p>
                    結束回合後電腦勢力同時下令，部隊依輪換先後次序抵達並結算；對向行軍不在途中交戰。佔領全部
                    15 城且無敵軍在外，即獲勝。
                  </p>
                </li>
              </ol>
              <p className="prototype-note">
                均衡開局：三方各3城、36,000兵、4,200金、18,000糧；行軍道路與中立城防守對稱，公平爭奪荊州。舊存檔保留原戰局，新數值即時生效。
                <br />
                本作是受經典三國策略遊戲啟發的原創簡化原型，採用架空英雄集結劇本；不包含《三國志11》的原版素材與完整系統。
              </p>
            </TabsContent>
            <TabsContent value="saves">
              <div className="save-panel">
                <Save size={30} />
                <h3>隨時收兵，隨時再戰</h3>
                <p>
                  每次行動後自動保存到當前瀏覽器。可匯出 JSON
                  存檔備份，或帶到另一臺裝置繼續。匯入會替換當前戰局。
                </p>
                <button className="gold-button" onClick={exportSave}>
                  <Download size={17} />
                  匯出當前存檔
                </button>
                <button
                  className="outline-button"
                  onClick={() => imported.current?.click()}
                >
                  <Upload size={17} />
                  匯入存檔
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) {
            playSfx('close');
            setDetail(null);
          }
        }}
      >
        <DialogContent className="game-dialog officer-detail-dialog">
          {detail && (
            <>
              <div className="officer-detail-top">
                <Portrait officer={detail} />
                <div>
                  <span className="eyebrow">
                    {E.FACTIONS[detail.faction].name}勢力 · {detail.specialty}
                  </span>
                  <DialogTitle>{detail.name}</DialogTitle>
                  <DialogDescription>{detail.role}</DialogDescription>
                  <span className="detail-status">
                    {E.officerAvailable(g, detail.id)
                      ? '本陣待命'
                      : `休整至第 ${g.officerReadyAt[detail.id] || g.turn + 1} 回合`}
                  </span>
                </div>
              </div>
              <div className="detail-stats">
                {(
                  [
                    ['統率', detail.command],
                    ['武力', detail.war],
                    ['智略', detail.int],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <div>
                      <i style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="detail-benefits">
                <p>
                  <b>統兵上限</b>
                  <span>{fmt(E.leaderCapacity(detail))} 兵</span>
                </p>
                <p>
                  <b>綜合統軍</b>
                  <span>{E.combatSkill(detail).toFixed(1)} / 99</span>
                </p>
                <p>
                  <b>行軍節糧</b>
                  <span>{Math.round(detail.int * 0.2)}%</span>
                </p>
                <p>
                  <b>內政減費</b>
                  <span>
                    {Math.round(
                      Math.min(0.2, Math.max(0, detail.int - 50) * 0.004) * 100,
                    )}
                    %
                  </span>
                </p>
              </div>
              <p className="prototype-note">
                統率、武力、智略共同決定出征戰力。可在城池指令中任命內政武將，或在出徵時選為主將。數值為本作原創設定。
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={imported}
        onChange={(event) => void importSave(event.target.files?.[0])}
      />
      <AlertDialog
        open={restart}
        onOpenChange={(open) => {
          playSfx(open ? 'open' : 'close');
          setRestart(open);
        }}
      >
        <AlertDialogContent className="game-dialog">
          <AlertDialogTitle>另啟新局</AlertDialogTitle>
          <AlertDialogDescription>
            當前自動存檔將被新戰局替換。需要保留時，請先匯出存檔。
          </AlertDialogDescription>
          <div className="confirm-buttons">
            <AlertDialogCancel onClick={() => playSfx('cancel')}>
              繼續當前戰局
            </AlertDialogCancel>
            <button
              className="gold-button"
              onClick={() => {
                playSfx('confirm');
                setRestart(false);
                setSetup(true);
              }}
            >
              選擇新勢力
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={g.status !== 'playing' && !setup} onOpenChange={() => {}}>
        <DialogContent
          className="game-dialog result-dialog"
          showCloseButton={false}
        >
          <Flag size={44} />
          <DialogTitle>
            {g.status === 'won' ? '山河一統' : '捲土重來'}
          </DialogTitle>
          <DialogDescription>
            {g.status === 'won'
              ? `${me.name}歷經 ${g.turn - 1} 回合，終使十五城盡歸一統。`
              : '城池已失，壯志未酬。整頓兵馬，再爭天下。'}
          </DialogDescription>
          <button className="gold-button" onClick={() => setSetup(true)}>
            再啟征程 <ArrowRight size={18} />
          </button>
          <button className="outline-button" onClick={exportSave}>
            匯出此役存檔
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
/** Wraps a value so its row flashes in the direction the number moved. */
function ValueFlash({
  value,
  className,
  children,
}: {
  value: number;
  className?: string;
  children: ReactNode;
}) {
  const change = useValueDelta(value);
  return (
    <span className={cn(className, change && `flash-${change.direction}`)}>
      {children}
    </span>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  const change = useValueDelta(value);
  return (
    <div className={cn('stat-row', change && `flash-${change.direction}`)}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
      <b>
        <AnimatedNumber
          value={value}
          showDelta={false}
          format={(display) => `${Math.round(display)}`}
        />
        <small> / 100</small>
      </b>
    </div>
  );
}
/** The garrison figure printed under a city on the map. */
function CityTroops({ troops }: { troops: number }) {
  const change = useValueDelta(troops);
  return (
    <span className={cn('city-troops', change && `is-${change.direction}`)}>
      <AnimatedNumber value={troops} format={compact} />
    </span>
  );
}
/** Faction city tally in the map legend. */
function LegendCount({ count }: { count: number }) {
  const change = useValueDelta(count);
  return (
    <b className={cn(change && `flash-${change.direction}`)}>
      <AnimatedNumber
        value={count}
        showDelta={false}
        format={(display) => `${Math.round(display)}`}
      />
    </b>
  );
}
