import * as T from 'three';
import { registerGameTools } from './webmcp';
import {
  createOffice,
  createBeach,
  makePaper,
  disposeRoom,
  type Room,
} from './scenes';
import {
  advanceBall,
  basketFor,
  FIXED_STEP,
  launchVelocity,
  newBall,
  predict,
  type BallState,
} from './physics';
export type GameState = {
  level: number;
  score: number;
  shots: number;
  made: number;
  streak: number;
  power: number;
  yaw: number;
  elevation: number;
  phase: 'ready' | 'aiming' | 'flying' | 'transition';
  message: string;
  unlocked: boolean;
};
export class Game {
  state: GameState = {
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
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(49, 1, 0.05, 180);
  private renderer: T.WebGLRenderer;
  private room: Room;
  private origin = new T.Vector3(0, 1.3, 4.8);
  private paper: T.Mesh;
  private ball: BallState | null = null;
  private settled: T.Mesh[] = [];
  private dots: T.InstancedMesh;
  private marker: T.Mesh;
  private trajectory: T.Group;
  private trail: T.Line;
  private trailPoints: T.Vector3[] = [];
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private elapsed = 0;
  private resizeObserver: ResizeObserver;
  private dragging: { id: number; y: number; power: number } | null = null;
  private paused = false;
  private muted = true;
  private audio: AudioContext | null = null;
  private messageUntil = 0;
  private scoreTime = 0;
  private unlockPending = false;
  private listeners: (() => void)[] = [];
  private disposed = false;
  constructor(
    private mount: HTMLDivElement,
    private onState: (state: GameState) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    mount.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 2.18, 5.8);
    this.camera.lookAt(0, 1.15, -2.8);
    this.room = createOffice(this.scene);
    this.paper = makePaper();
    this.paper.position.copy(this.origin);
    this.scene.add(this.paper);
    this.trajectory = new T.Group();
    this.scene.add(this.trajectory);
    this.dots = new T.InstancedMesh(
      new T.SphereGeometry(0.024, 8, 6),
      new T.MeshBasicMaterial({
        color: '#e7f2c3',
        transparent: true,
        opacity: 0.87,
        depthWrite: false,
      }),
      100,
    );
    this.dots.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.dots.frustumCulled = false;
    this.trajectory.add(this.dots);
    this.marker = new T.Mesh(
      new T.RingGeometry(0.19, 0.215, 48),
      new T.MeshBasicMaterial({
        color: '#e2f2b7',
        transparent: true,
        opacity: 0.7,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.trajectory.add(this.marker);
    this.trail = new T.Line(
      new T.BufferGeometry(),
      new T.LineBasicMaterial({
        color: '#f4ffce',
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.scene.add(this.trail);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(mount);
    this.resize();
    this.bind();
    this.updateTrajectory();
    this.emit();
    this.listeners.push(registerGameTools(this));
    this.raf = requestAnimationFrame(this.frame);
  }
  private emit() {
    this.onState({ ...this.state });
  }
  private resize() {
    const { width, height } = this.mount.getBoundingClientRect();
    this.renderer.setSize(Math.max(width, 1), Math.max(height, 1));
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.fov = width < 500 ? 64 : 49;
    this.camera.updateProjectionMatrix();
  }
  private listen(
    target: EventTarget,
    type: string,
    fn: EventListener,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, fn, options);
    this.listeners.push(() => target.removeEventListener(type, fn, options));
  }
  private bind() {
    this.listen(this.mount, 'pointermove', ((e: PointerEvent) => {
      if (
        this.paused ||
        this.state.phase === 'flying' ||
        this.state.phase === 'transition'
      )
        return;
      if (this.dragging) {
        if (this.dragging.id !== e.pointerId) return;
        this.setPower(
          this.dragging.power + (e.clientY - this.dragging.y) * 0.22,
        );
      } else {
        const r = this.mount.getBoundingClientRect();
        this.state.yaw = T.MathUtils.clamp(
          ((e.clientX - r.left - r.width / 2) / r.width) * 44,
          -22,
          22,
        );
        this.state.elevation = T.MathUtils.clamp(
          46 - ((e.clientY - r.top - r.height * 0.52) / r.height) * 47,
          22,
          69,
        );
        this.updateTrajectory();
        this.emit();
      }
    }) as EventListener);
    this.listen(this.mount, 'pointerdown', ((e: PointerEvent) => {
      if (e.button !== 0 || this.paused || this.state.phase !== 'ready') return;
      e.preventDefault();
      this.mount.focus({ preventScroll: true });
      this.dragging = {
        id: e.pointerId,
        y: e.clientY,
        power: this.state.power,
      };
      this.mount.setPointerCapture(e.pointerId);
      this.state.phase = 'aiming';
      this.emit();
    }) as EventListener);
    this.listen(this.mount, 'pointerup', ((e: PointerEvent) => {
      if (!this.dragging || this.dragging.id !== e.pointerId) return;
      this.dragging = null;
      if (this.mount.hasPointerCapture(e.pointerId))
        this.mount.releasePointerCapture(e.pointerId);
      this.throwBall();
    }) as EventListener);
    const cancel = () => {
      if (this.dragging) {
        this.dragging = null;
        if (this.state.phase === 'aiming') {
          this.state.phase = 'ready';
          this.emit();
        }
      }
    };
    this.listen(this.mount, 'pointercancel', cancel);
    this.listen(this.mount, 'lostpointercapture', cancel);
    this.listen(window, 'blur', cancel);
    this.listen(window, 'keydown', ((e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        this.paused ||
        target.closest('button,input,[role="slider"],[role="dialog"]')
      )
        return;
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          ' ',
          '=',
          '+',
          '-',
          '_',
        ].includes(e.key)
      )
        e.preventDefault();
      if (this.state.phase !== 'ready') return;
      if (e.code === 'Space') {
        if (!e.repeat) this.throwBall();
        return;
      }
      if (e.key === 'ArrowLeft') this.state.yaw -= 0.6;
      else if (e.key === 'ArrowRight') this.state.yaw += 0.6;
      else if (e.key === 'ArrowUp') this.state.elevation += 0.7;
      else if (e.key === 'ArrowDown') this.state.elevation -= 0.7;
      else if (e.key === '+' || e.key === '=') {
        this.setPower(this.state.power + 1);
        return;
      } else if (e.key === '-' || e.key === '_') {
        this.setPower(this.state.power - 1);
        return;
      } else return;
      this.state.yaw = T.MathUtils.clamp(this.state.yaw, -22, 22);
      this.state.elevation = T.MathUtils.clamp(this.state.elevation, 22, 69);
      this.updateTrajectory();
      this.emit();
    }) as EventListener);
    this.listen(document, 'visibilitychange', () => {
      this.last = 0;
      this.accumulator = 0;
    });
  }
  private updateTrajectory() {
    const { points, success } = predict(
      this.origin,
      launchVelocity(this.state.yaw, this.state.elevation, this.state.power),
      basketFor(this.state.level),
      this.room.obstacles,
    );
    const matrix = new T.Matrix4();
    this.dots.count = Math.min(points.length, 100);
    for (let i = 0; i < this.dots.count; i++) {
      matrix.makeTranslation(points[i].x, points[i].y, points[i].z);
      this.dots.setMatrixAt(i, matrix);
    }
    this.dots.instanceMatrix.needsUpdate = true;
    (this.dots.material as T.MeshBasicMaterial).color.set(
      success ? '#d4ed92' : '#f4f2db',
    );
    const end = points[points.length - 1];
    if (end) {
      this.marker.position.set(end.x, 0.012, end.z);
      (this.marker.material as T.MeshBasicMaterial).color.set(
        success ? '#d4ed92' : '#f4f2db',
      );
    }
    this.marker.visible = !!end;
  }
  aim(yaw: number, elevation: number, power: number) {
    if (this.state.phase !== 'ready' || this.paused) return;
    this.state.yaw = T.MathUtils.clamp(yaw, -22, 22);
    this.state.elevation = T.MathUtils.clamp(elevation, 22, 69);
    this.setPower(power);
  }
  setPower(value: number) {
    if (this.state.phase === 'flying' || this.state.phase === 'transition')
      return;
    this.state.power = T.MathUtils.clamp(value, 15, 100);
    this.updateTrajectory();
    this.emit();
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (!value) this.sound('ready');
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.dragging = null;
    if (this.state.phase === 'aiming') this.state.phase = 'ready';
    this.last = 0;
    this.accumulator = 0;
    this.emit();
  }
  private sound(kind: 'throw' | 'score' | 'hit' | 'ready') {
    if (this.muted) return;
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume();
      const t = this.audio.currentTime;
      const osc = this.audio.createOscillator(),
        gain = this.audio.createGain();
      osc.connect(gain);
      gain.connect(this.audio.destination);
      osc.type = kind === 'hit' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(
        kind === 'score'
          ? 660
          : kind === 'hit'
            ? 180
            : kind === 'throw'
              ? 380
              : 420,
        t,
      );
      osc.frequency.exponentialRampToValueAtTime(
        kind === 'score' ? 1080 : 80,
        t + 0.16,
      );
      gain.gain.setValueAtTime(kind === 'hit' ? 0.02 : 0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.23);
    } catch {
      /* Audio is optional; throwing remains available. */
    }
  }
  throwBall() {
    if (
      this.paused ||
      this.disposed ||
      !['ready', 'aiming'].includes(this.state.phase)
    )
      return;
    this.dragging = null;
    this.state.phase = 'flying';
    this.state.shots++;
    this.state.message = '';
    this.ball = newBall(
      this.origin,
      launchVelocity(this.state.yaw, this.state.elevation, this.state.power),
    );
    this.paper.position.copy(this.origin);
    this.trajectory.visible = false;
    this.trailPoints = [];
    this.scoreTime = 0;
    this.sound('throw');
    this.emit();
  }
  private score() {
    this.state.score += 10;
    this.state.made++;
    this.state.streak++;
    this.state.message =
      this.state.streak >= 3
        ? `+10 · ${this.state.streak} in a row`
        : '+10 · Beautifully done.';
    this.messageUntil = this.elapsed + 1.8;
    this.scoreTime = this.elapsed;
    this.sound('score');
    if (
      this.state.level === 1 &&
      this.state.score >= 100 &&
      !this.state.unlocked
    ) {
      this.state.unlocked = true;
      this.unlockPending = true;
    }
    this.emit();
  }
  private nextBall() {
    if (!this.ball) return;
    if (!this.ball.scored) {
      this.state.streak = 0;
      this.state.message = 'Almost. Give it another toss.';
      this.messageUntil = this.elapsed + 1.6;
    }
    this.settled.push(this.paper);
    if (this.settled.length > 16) {
      const old = this.settled.shift()!;
      old.removeFromParent();
      old.geometry.dispose();
      (old.material as T.Material).dispose();
    }
    this.paper = makePaper(this.state.shots + 1);
    this.paper.position.copy(this.origin);
    this.scene.add(this.paper);
    this.ball = null;
    this.trail.geometry.dispose();
    this.trail.geometry = new T.BufferGeometry();
    if (this.unlockPending) {
      this.unlockPending = false;
      this.state.phase = 'transition';
      this.paper.visible = false;
      this.state.message = '';
    } else {
      this.state.phase = 'ready';
      this.trajectory.visible = true;
      this.updateTrajectory();
    }
    this.emit();
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    if (!this.paused && !document.hidden) {
      this.elapsed += dt;
      this.room.animate(this.elapsed);
      if (this.state.message && this.elapsed > this.messageUntil) {
        this.state.message = '';
        this.emit();
      }
      if (this.ball) {
        this.accumulator += dt;
        while (this.accumulator >= FIXED_STEP && this.ball) {
          const result = advanceBall(
            this.ball,
            FIXED_STEP,
            basketFor(this.state.level),
            this.room.obstacles,
          );
          if (result.scored) this.score();
          if (result.hit && this.ball.velocity.length() > 1.1)
            this.sound('hit');
          this.accumulator -= FIXED_STEP;
        }
        if (this.ball) {
          this.paper.position.copy(this.ball.position);
          this.paper.rotation.x += dt * 4;
          this.paper.rotation.z += dt * 3;
          this.trailPoints.push(this.ball.position.clone());
          if (this.trailPoints.length > 100) this.trailPoints.shift();
          this.trail.geometry.dispose();
          this.trail.geometry = new T.BufferGeometry().setFromPoints(
            this.trailPoints,
          );
          if (
            (this.ball.scored && this.elapsed - this.scoreTime > 1.15) ||
            this.ball.age > 4 ||
            (this.ball.touched &&
              this.ball.velocity.length() < 0.3 &&
              this.ball.age > 1.1) ||
            this.ball.position.length() > 35
          )
            this.nextBall();
        }
      } else if (this.state.phase !== 'transition') {
        this.paper.position.copy(this.origin);
        this.paper.position.y += Math.sin(this.elapsed * 1.6) * 0.011;
        this.paper.rotation.y += dt * 0.2;
      }
      this.room.bin.scale.setScalar(
        1 +
          (this.scoreTime && this.elapsed - this.scoreTime < 0.5
            ? Math.sin((this.elapsed - this.scoreTime) * Math.PI * 2) * 0.025
            : 0),
      );
    }
    this.renderer.render(this.scene, this.camera);
  };
  changeLevel(level: number) {
    if (level !== 1 && level !== 2) return;
    if (level === 2 && !this.state.unlocked) return;
    if (level === this.state.level && this.state.phase !== 'transition') return;
    this.clearBalls();
    disposeRoom(this.room.group);
    this.state.level = level;
    this.state.phase = 'ready';
    this.state.message = '';
    this.state.yaw = level === 2 ? 4.7 : 0;
    this.state.elevation = 46;
    this.state.power = level === 2 ? 69 : 58;
    this.room =
      level === 2 ? createBeach(this.scene) : createOffice(this.scene);
    this.paper.visible = true;
    this.trajectory.visible = true;
    this.updateTrajectory();
    this.emit();
  }
  private clearBalls() {
    this.ball = null;
    this.dragging = null;
    this.accumulator = 0;
    this.unlockPending = false;
    this.scoreTime = 0;
    for (const p of this.settled) {
      p.removeFromParent();
      p.geometry.dispose();
      (p.material as T.Material).dispose();
    }
    this.settled = [];
    this.paper.position.copy(this.origin);
    this.trail.geometry.dispose();
    this.trail.geometry = new T.BufferGeometry();
  }
  restart() {
    this.clearBalls();
    this.state = {
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
    disposeRoom(this.room.group);
    this.room = createOffice(this.scene);
    this.paper.visible = true;
    this.trajectory.visible = true;
    this.updateTrajectory();
    this.emit();
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.listeners.forEach((fn) => fn());
    disposeRoom(this.room.group);
    this.clearBalls();
    this.paper.geometry.dispose();
    (this.paper.material as T.Material).dispose();
    this.dots.geometry.dispose();
    (this.dots.material as T.Material).dispose();
    this.marker.geometry.dispose();
    (this.marker.material as T.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as T.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    void this.audio?.close();
  }
}
