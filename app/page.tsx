'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  CircleHelp,
  Lock,
  Check,
  MousePointer2,
  MoveUpRight,
  Trash2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Game, GameState } from '@/lib/game';
const initial: GameState = {
  level: 1,
  score: 0,
  shots: 0,
  made: 0,
  streak: 0,
  power: 58,
  yaw: 0,
  elevation: 46,
  phase: 'ready',
  message: '',
  unlocked: false,
};
export default function Home() {
  const mount = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [state, setState] = useState(initial);
  const [help, setHelp] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const beach = state.level === 2;
  useEffect(() => {
    let disposed = false;
    import('@/lib/game')
      .then(({ Game }) => {
        if (disposed || !mount.current) return;
        try {
          game.current = new Game(mount.current, setState);
          setLoaded(true);
        } catch {
          setError(
            'Your browser could not start 3D graphics. Enable hardware acceleration, then reload to play.',
          );
        }
      })
      .catch(() =>
        setError('The game could not load. Please reload to try again.'),
      );
    return () => {
      disposed = true;
      game.current?.dispose();
      game.current = null;
    };
  }, []);
  useEffect(() => {
    game.current?.setPaused(help);
  }, [help]);
  const changeLevel = (level: number) => game.current?.changeLevel(level);
  return (
    <main className={`game-app ${beach ? 'beach-theme' : ''}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Trashketball home">
          <span className="brand-symbol">
            <Trash2 size={21} strokeWidth={1.7} />
            <span className="brand-dot" />
          </span>
          trashketball<span className="brand-period">.</span>
        </a>
        <div className="top-caption">A LITTLE PAPER. A GREAT ESCAPE.</div>
        <div className="header-right">
          <span className="live-dot" /> AFTER HOURS{' '}
          <span className="edition">VOL. 01</span>
        </div>
      </header>
      <section className="play-layout" aria-label="Trashketball game">
        <aside className="sidebar">
          <div className="chapter-eyebrow">
            <span className="tiny-line" /> THE GREAT ESCAPE
          </div>
          <h1>
            Out of
            <br />
            office<span>.</span>
          </h1>
          <p className="intro">
            Clock out. Crumple up.
            <br />
            Make every throw count.
          </p>
          <div className="level-list" aria-label="Levels">
            <button
              className={`level-card ${!beach ? 'active' : ''}`}
              onClick={() => changeLevel(1)}
              disabled={!loaded}
            >
              <span className="level-number">01</span>
              <span>
                <span className="level-overline">SEVERED FLOOR</span>
                <strong>Office overtime</strong>
                <small>{!beach ? 'YOU ARE HERE' : 'BACK TO WORK'}</small>
              </span>
              <span className="level-status">
                {beach ? <Check size={17} /> : <ArrowUpRight size={19} />}
              </span>
            </button>
            <span className="level-connector" />
            <button
              className={`level-card ${beach ? 'active' : ''} ${!state.unlocked ? 'locked' : ''}`}
              disabled={!state.unlocked || !loaded}
              onClick={() => changeLevel(2)}
            >
              <span className="level-number">02</span>
              <span>
                <span className="level-overline">OCEAN RESIDENCE</span>
                <strong>Coastal escape</strong>
                <small>
                  {beach
                    ? 'YOU ARE HERE'
                    : state.unlocked
                      ? 'READY WHEN YOU ARE'
                      : 'UNLOCK AT 100 POINTS'}
                </small>
              </span>
              <span className="level-status">
                {!state.unlocked ? (
                  <Lock size={15} />
                ) : (
                  <ArrowUpRight size={19} />
                )}
              </span>
            </button>
          </div>
          <div className="mission">
            <span className="label">
              {beach ? 'CURRENT ASSIGNMENT' : 'YOUR EXIT STRATEGY'}
            </span>
            <p>
              {beach
                ? 'Same game. Much better view.'
                : '10 good throws between you and the ocean.'}
            </p>
            <div className="mission-meta">
              <span>{beach ? 'Beach score' : 'Escape progress'}</span>
              <strong>
                {beach
                  ? Math.max(state.score - 100, 0)
                  : Math.min(state.score, 100)}
                <span> / 100</span>
              </strong>
            </div>
            <Progress
              aria-label={beach ? 'Beach progress' : 'Progress to level two'}
              value={
                beach
                  ? Math.min(Math.max(state.score - 100, 0), 100)
                  : Math.min(state.score, 100)
              }
            />
          </div>
          <div className="sidebar-bottom">
            <span className="paper-mark">↗</span>
            <p>Time well wasted.</p>
            <span className="small-rule" />
            <span className="sidebar-footer">EST. AFTER YOUR LAST MEETING</span>
          </div>
        </aside>
        <div className="main-column">
          <div className="scene-heading">
            <div>
              <span className="room-index">LEVEL 0{state.level}</span>
              <span className="room-title">
                {beach ? 'Ocean Residence' : 'Macrodata Refinement'}
              </span>
              <span className="room-separator">/</span>
              <span className="room-location">
                {beach ? 'A very good Airbnb' : 'Severed floor'}
              </span>
            </div>
            <button className="help-button" onClick={() => setHelp(true)}>
              <CircleHelp size={16} />
              <span>How to play</span>
            </button>
          </div>
          <div className="arena-frame">
            <div
              ref={mount}
              className="arena"
              aria-label="3D game. Move to aim, hold and pull down to adjust power, release to throw. Arrow keys aim; Space throws."
              tabIndex={0}
            />
            <div className="scene-vignette" />
            <div className="scene-top">
              <div className="scene-tag">
                <span className="live-dot" />
                {beach ? 'OUTIE MODE' : 'INNIE MODE'}
              </div>
              <div className="scene-tools">
                <button
                  onClick={() => {
                    const value = !muted;
                    setMuted(value);
                    game.current?.setMuted(value);
                  }}
                  aria-label={muted ? 'Enable sound' : 'Mute sound'}
                >
                  {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
                <button
                  aria-label="Fullscreen game"
                  onClick={() => {
                    if (document.fullscreenElement)
                      void document.exitFullscreen();
                    else
                      void document
                        .querySelector('.arena-frame')
                        ?.requestFullscreen?.()
                        .catch(() => {});
                  }}
                >
                  <Maximize size={17} />
                </button>
              </div>
            </div>
            <div className="scene-caption">
              <span>
                {beach
                  ? 'CHECK-IN COMPLETE'
                  : 'PLEASE ENJOY EACH THROW EQUALLY'}
              </span>
              <i>
                {beach ? 'The ocean can wait.' : 'Your outie would be proud.'}
              </i>
            </div>
            <div
              className={`shot-feedback ${state.message ? 'show' : ''}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {state.message}
            </div>
            <div className="scene-bottom">
              <span className="distance-label">
                <span className="distance-dot" />
                {beach ? '5.5' : '4.8'} m TO BIN
              </span>
              <span className="aim-instruction">
                <MousePointer2 size={14} />
                {state.phase === 'flying'
                  ? 'PAPER IN FLIGHT'
                  : state.phase === 'aiming'
                    ? 'RELEASE TO THROW'
                    : 'AIM · PULL BACK · RELEASE'}
              </span>
              <span className="gravity-label">+10 / BASKET</span>
            </div>
            {!loaded && (
              <div className="loading-cover">
                <span className="loading-ball" />
                <p>{error || 'Preparing your work–life balance…'}</p>
                {error && (
                  <button onClick={() => location.reload()}>Reload game</button>
                )}
              </div>
            )}
            {state.phase === 'transition' && (
              <div className="escape-overlay">
                <div className="escape-card">
                  <span className="eyebrow">
                    100 POINTS. TIME TO CLOCK OUT.
                  </span>
                  <span className="escape-icon">↗</span>
                  <h2>You’re out of office.</h2>
                  <p>
                    Your beachside Airbnb is ready.
                    <br />
                    The paper tossing continues.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => changeLevel(2)}
                  >
                    Check in at the coast <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="controls-row">
            <div className="score-block">
              <span className="label">TOTAL SCORE</span>
              <div className="score-value">
                {String(state.score).padStart(3, '0')}
                <span>PTS</span>
              </div>
            </div>
            <div className="stats-block">
              <div>
                <span className="label">BASKETS</span>
                <strong>
                  {String(state.made).padStart(2, '0')}
                  <span> / {String(state.shots).padStart(2, '0')}</span>
                </strong>
              </div>
              <div>
                <span className="label">STREAK</span>
                <strong>
                  {String(state.streak).padStart(2, '0')}
                  <span> IN A ROW</span>
                </strong>
              </div>
            </div>
            <div className="power-block">
              <div>
                <label id="power-label" className="label">
                  THROW POWER
                </label>
                <strong>
                  {Math.round(state.power)}
                  <span>%</span>
                </strong>
              </div>
              <Slider
                aria-labelledby="power-label"
                value={[state.power]}
                min={15}
                max={100}
                step={1}
                disabled={
                  state.phase === 'flying' || state.phase === 'transition'
                }
                onValueChange={(value) =>
                  game.current?.setPower(
                    Array.isArray(value) ? value[0] : value,
                  )
                }
              />
              <div className="power-endpoints">
                <span>A gentle toss</span>
                <span>Give it some</span>
              </div>
            </div>
            <button
              className="throw-button"
              onClick={() => game.current?.throwBall()}
              disabled={
                !loaded ||
                state.phase === 'flying' ||
                state.phase === 'transition'
              }
            >
              Throw paper <MoveUpRight size={20} />
              <kbd>SPACE</kbd>
            </button>
          </div>
          <footer className="game-footer">
            <div>
              <span className="key-hint">
                <kbd>↔</kbd>
                <kbd>↕</kbd> Aim
              </span>
              <span>
                <kbd>+</kbd>
                <kbd>−</kbd> Power
              </span>
              <span>
                <kbd>SPACE</kbd> Throw
              </span>
            </div>
            <button onClick={() => game.current?.restart()} disabled={!loaded}>
              <RotateCcw size={14} />
              Start over
            </button>
          </footer>
        </div>
      </section>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog">
          <DialogTitle>Paperwork, made enjoyable.</DialogTitle>
          <DialogDescription>
            Land a crumpled paper ball inside the bin for 10 points. Reach 100
            to leave the office for your beachside Airbnb.
          </DialogDescription>
          <div className="help-steps">
            <p>
              <strong>01 · Aim</strong>Move your pointer over the room, or use
              the arrow keys. The dotted arc previews your throw.
            </p>
            <p>
              <strong>02 · Set your power</strong>Hold in the room and pull
              downward, or adjust the power slider. Watch the arc change.
            </p>
            <p>
              <strong>03 · Let it fly</strong>Release your pointer, press Space,
              or click Throw paper. The ball follows gravity and air resistance.
              Rim shots can bounce in or out.
            </p>
          </div>
          <button className="primary-button" onClick={() => setHelp(false)}>
            Back to the game <ArrowRight size={18} />
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
