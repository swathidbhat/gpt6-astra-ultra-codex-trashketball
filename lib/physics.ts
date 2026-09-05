import { Vector3 } from 'three';
export const GRAVITY = 9.81;
export const DRAG = 0.14;
export const BALL_RADIUS = 0.095;
export const FIXED_STEP = 1 / 120;
export type Basket = {
  x: number;
  z: number;
  height: number;
  radius: number;
  bottomRadius: number;
  rim: number;
};
export type Obstacle = { min: Vector3; max: Vector3 };
export type BallState = {
  position: Vector3;
  velocity: Vector3;
  scored: boolean;
  above: boolean;
  age: number;
  touched: boolean;
};
export function basketFor(level: number): Basket {
  return {
    x: level === 2 ? 0.45 : 0,
    z: level === 2 ? -0.7 : 0,
    height: level === 2 ? 0.77 : 0.72,
    radius: level === 2 ? 0.43 : 0.47,
    bottomRadius: level === 2 ? 0.35 : 0.34,
    rim: 0.023,
  };
}
export function launchVelocity(yaw: number, elevation: number, power: number) {
  const y = (yaw * Math.PI) / 180,
    p = (elevation * Math.PI) / 180,
    s = 4 + power * 0.05;
  return new Vector3(
    Math.sin(y) * Math.cos(p) * s,
    Math.sin(p) * s,
    -Math.cos(y) * Math.cos(p) * s,
  );
}
export function integrate(position: Vector3, velocity: Vector3, dt: number) {
  const e = Math.exp(-DRAG * dt),
    s = -Math.expm1(-DRAG * dt) / DRAG;
  position.addScaledVector(velocity, s);
  position.y -= (GRAVITY * (dt - s)) / DRAG;
  velocity.multiplyScalar(e);
  velocity.y -= GRAVITY * s;
}
export function freePosition(origin: Vector3, velocity: Vector3, time: number) {
  const p = origin.clone();
  integrate(p, velocity.clone(), time);
  return p;
}
function reflect(v: Vector3, n: Vector3, restitution: number) {
  const vn = v.dot(n);
  if (vn < 0) {
    v.addScaledVector(n, -(1 + restitution) * vn);
    const normal = n.clone().multiplyScalar(v.dot(n));
    v.sub(normal).multiplyScalar(0.83).add(normal);
  }
}
export function advanceBall(
  ball: BallState,
  dt: number,
  basket: Basket,
  obstacles: Obstacle[] = [],
): { scored: boolean; hit: boolean } {
  let scored = false,
    hit = false;
  // Bound travel to 12 mm: considerably smaller than the ball and rim thickness.
  const steps = Math.max(
    1,
    Math.ceil(((ball.velocity.length() + GRAVITY * dt) * dt) / 0.012),
  );
  const step = dt / steps;
  for (let i = 0; i < steps; i++) {
    const old = ball.position.clone();
    const oldV = ball.velocity.clone();
    integrate(ball.position, ball.velocity, step);
    ball.age += step;
    const p = ball.position,
      v = ball.velocity;
    if (p.y > basket.height + BALL_RADIUS) ball.above = true;
    const dx = p.x - basket.x,
      dz = p.z - basket.z,
      rho = Math.hypot(dx, dz);
    const radial = new Vector3(
      rho > 1e-8 ? dx / rho : 1,
      0,
      rho > 1e-8 ? dz / rho : 0,
    );
    const nearestRim = new Vector3(
      basket.x,
      basket.height,
      basket.z,
    ).addScaledVector(radial, basket.radius);
    const normal = p.clone().sub(nearestRim);
    const distance = normal.length();
    if (distance < BALL_RADIUS + basket.rim) {
      normal.normalize();
      p.addScaledVector(normal, BALL_RADIUS + basket.rim - distance + 0.0001);
      reflect(v, normal, 0.42);
      hit = true;
      ball.touched = true;
    }
    // Tapered shell has two sides, so genuine inside and outside rebounds both work.
    if (p.y > 0.05 && p.y < basket.height - 0.03) {
      const wallRadius =
        basket.bottomRadius +
        ((basket.radius - basket.bottomRadius) * p.y) / basket.height;
      const delta = Math.hypot(p.x - basket.x, p.z - basket.z) - wallRadius;
      const slope = (basket.radius - basket.bottomRadius) / basket.height;
      const wallDistance = Math.abs(delta) / Math.sqrt(1 + slope * slope);
      if (wallDistance < BALL_RADIUS + 0.007) {
        const side = delta >= 0 ? 1 : -1;
        const n = new Vector3(radial.x, -slope, radial.z)
          .normalize()
          .multiplyScalar(side);
        p.addScaledVector(n, BALL_RADIUS + 0.007 - wallDistance + 0.0001);
        reflect(v, n, 0.3);
        hit = true;
        ball.touched = true;
      }
    }
    if (
      !ball.scored &&
      ball.above &&
      old.y >= basket.height &&
      p.y < basket.height &&
      v.y < 0
    ) {
      let lo = 0,
        hi = step;
      for (let n = 0; n < 18; n++) {
        const mid = (lo + hi) / 2;
        if (freePosition(old, oldV, mid).y > basket.height) lo = mid;
        else hi = mid;
      }
      const crossing = freePosition(old, oldV, (lo + hi) / 2);
      if (
        Math.hypot(crossing.x - basket.x, crossing.z - basket.z) <
        basket.radius - basket.rim - BALL_RADIUS - 0.005
      ) {
        ball.scored = true;
        scored = true;
      }
    }
    const inside =
      Math.hypot(p.x - basket.x, p.z - basket.z) < basket.bottomRadius;
    const floor = inside ? 0.04 : 0;
    if (p.y < BALL_RADIUS + floor) {
      p.y = BALL_RADIUS + floor;
      reflect(v, new Vector3(0, 1, 0), 0.26);
      v.x *= 0.93;
      v.z *= 0.93;
      hit = true;
      ball.touched = true;
      if (Math.abs(v.y) < 0.08) v.y = 0;
    }
    for (const obstacle of obstacles) {
      const q = p.clone().clamp(obstacle.min, obstacle.max);
      const n = p.clone().sub(q),
        d = n.length();
      if (d > 0 && d < BALL_RADIUS) {
        n.divideScalar(d);
        p.addScaledVector(n, BALL_RADIUS - d + 0.001);
        reflect(v, n, 0.28);
        hit = true;
        ball.touched = true;
      }
    }
  }
  return { scored, hit };
}
export function newBall(origin: Vector3, velocity: Vector3): BallState {
  return {
    position: origin.clone(),
    velocity: velocity.clone(),
    scored: false,
    above: false,
    age: 0,
    touched: false,
  };
}
export function predict(
  origin: Vector3,
  velocity: Vector3,
  basket: Basket,
  obstacles: Obstacle[] = [],
) {
  const b = newBall(origin, velocity),
    points: Vector3[] = [];
  let success = false;
  for (let n = 0; n < 400; n++) {
    const result = advanceBall(b, FIXED_STEP, basket, obstacles);
    if (n % 5 === 0) points.push(b.position.clone());
    if (result.scored) {
      success = true;
      points.push(b.position.clone());
      break;
    }
    if (result.hit) {
      points.push(b.position.clone());
      break;
    }
  }
  return { points, success };
}
