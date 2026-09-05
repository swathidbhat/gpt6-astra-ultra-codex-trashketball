import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { basketFor, type Obstacle } from './physics';
export type Room = {
  group: T.Group;
  bin: T.Group;
  obstacles: Obstacle[];
  animate: (time: number) => void;
};
const mat = (color: T.ColorRepresentation, roughness = 0.75, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
export function box(
  g: T.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
  rounded = 0,
) {
  const o = new T.Mesh(
    rounded
      ? new RoundedBoxGeometry(w, h, d, 3, rounded)
      : new T.BoxGeometry(w, h, d),
    m,
  );
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function cylinder(
  g: T.Object3D,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
  segments = 32,
) {
  const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, segments), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function label(
  g: T.Object3D,
  text: string,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  color = '#23463f',
  background = 'transparent',
  font = '500 80px Arial',
) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  if (background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 256);
  }
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 128);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  const m = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
function noiseTexture(color: string, type: 'carpet' | 'wood' | 'fabric') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  let seed = 162;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 16000; i++) {
    const v = rnd();
    ctx.fillStyle = `rgba(${v > 0.5 ? '255,255,230' : '0,15,8'},${rnd() * (type === 'wood' ? 0.055 : 0.14)})`;
    const x = rnd() * 256,
      y = rnd() * 256;
    ctx.fillRect(
      x,
      y,
      type === 'wood' ? 30 + rnd() * 100 : 1,
      type === 'fabric' ? 2 : 1,
    );
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(type === 'carpet' ? 12 : 3, type === 'carpet' ? 12 : 3);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
function terminal(g: T.Object3D, x: number, z: number, rotation = 0) {
  const t = new T.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotation;
  g.add(t);
  const shell = mat('#c4c9b3'),
    dark = mat('#253f35');
  box(t, 0.53, 0.08, 0.39, 0, 0.87, 0, shell, 0.035);
  box(t, 0.12, 0.15, 0.16, 0, 0.97, -0.025, shell, 0.012);
  const monitor = box(t, 0.67, 0.51, 0.39, 0, 1.25, -0.055, shell, 0.055);
  monitor.rotation.x = -0.065;
  box(t, 0.54, 0.37, 0.012, 0, 1.265, 0.147, dark, 0.015);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const cx = c.getContext('2d')!;
  cx.fillStyle = '#061e19';
  cx.fillRect(0, 0, 256, 192);
  cx.fillStyle = '#69a798';
  cx.font = '12px monospace';
  cx.fillText('LUMON // MDR', 14, 24);
  cx.fillStyle = '#b2d7a9';
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 13; col++)
      cx.fillText(
        String((row * 7 + col * 3 + Math.floor(x * 2 + 10)) % 10),
        13 + col * 18,
        45 + row * 15,
      );
  cx.fillStyle = '#619c86';
  cx.fillRect(14, 173, 226, 2);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const screen = new T.Mesh(
    new T.PlaneGeometry(0.48, 0.32),
    new T.MeshBasicMaterial({ map: tex }),
  );
  screen.position.set(0, 1.265, 0.156);
  t.add(screen);
  box(t, 0.66, 0.045, 0.22, 0, 0.875, 0.42, shell, 0.012);
  for (let r = 0; r < 4; r++)
    for (let j = 0; j < 12; j++)
      box(
        t,
        0.035,
        0.009,
        0.025,
        -0.275 + j * 0.05,
        0.902,
        0.34 + r * 0.043,
        mat(j % 5 ? '#abb5a2' : '#5b8774'),
      );
  box(t, 0.09, 0.04, 0.15, 0.47, 0.88, 0.35, shell, 0.025);
}
function chair(g: T.Object3D, x: number, z: number, rotation = 0) {
  const t = new T.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotation;
  g.add(t);
  const green = mat('#335b4f'),
    steel = mat('#6e8077', 0.4, 0.7);
  box(t, 0.57, 0.12, 0.58, 0, 0.49, 0, green, 0.045);
  box(t, 0.58, 0.58, 0.1, 0, 0.83, 0.25, green, 0.07);
  cylinder(t, 0.035, 0.035, 0.37, 0, 0.25, 0, steel, 12);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const leg = box(
      t,
      0.04,
      0.03,
      0.34,
      Math.sin(a) * 0.15,
      0.075,
      Math.cos(a) * 0.15,
      steel,
    );
    leg.rotation.y = a;
    cylinder(
      t,
      0.042,
      0.042,
      0.055,
      Math.sin(a) * 0.3,
      0.048,
      Math.cos(a) * 0.3,
      mat('#1e2924'),
      12,
    ).rotation.z = Math.PI / 2;
  }
  for (const s of [-1, 1]) {
    box(t, 0.045, 0.22, 0.045, s * 0.34, 0.57, 0.03, steel);
    box(t, 0.07, 0.045, 0.3, s * 0.34, 0.69, 0.03, green, 0.018);
  }
}
function desk(g: T.Object3D, x: number, z: number, rotation = 0) {
  const t = new T.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotation;
  g.add(t);
  const metal = mat('#708577', 0.6, 0.2),
    top = mat('#b9c3ad');
  box(t, 2.5, 0.085, 1.25, 0, 0.815, 0, top, 0.023);
  box(t, 2.52, 0.025, 1.27, 0, 0.77, 0, mat('#335447'));
  for (const side of [-1, 1])
    box(t, 0.09, 0.76, 1.05, side * 1.13, 0.38, 0, metal);
  box(t, 0.5, 0.56, 0.83, 0.75, 0.46, -0.04, mat('#adb9a5'), 0.02);
  for (let i = 0; i < 3; i++) {
    box(t, 0.45, 0.012, 0.01, 0.75, 0.3 + i * 0.17, 0.383, mat('#526b5c'));
    box(t, 0.15, 0.024, 0.025, 0.75, 0.35 + i * 0.17, 0.402, metal);
  }
  terminal(t, -0.45, -0.05);
  for (let i = 0; i < 5; i++)
    box(t, 0.3, 0.006, 0.37, 0.54, 0.864 + i * 0.007, 0.28, mat('#e9ecd9'));
  const mug = cylinder(t, 0.055, 0.048, 0.13, -1, 0.927, 0.25, mat('#dce3cf'));
  const handle = new T.Mesh(
    new T.TorusGeometry(0.043, 0.011, 8, 16),
    mat('#dce3cf'),
  );
  handle.position.set(-0.935, 0.935, 0.25);
  t.add(handle);
  return t;
}
export function makeBasket(level: number) {
  const b = basketFor(level),
    g = new T.Group();
  g.position.set(b.x, 0, b.z);
  const dark = mat(level === 1 ? '#596e68' : '#514137', 0.55, 0.35);
  const inside = mat(level === 1 ? '#334944' : '#342d26');
  const points = [
    new T.Vector2(b.bottomRadius, 0.04),
    new T.Vector2(b.radius, b.height),
    new T.Vector2(b.radius - 0.02, b.height),
    new T.Vector2(b.bottomRadius - 0.025, 0.055),
  ];
  if (level === 1) {
    const side = new T.Mesh(
      new T.CylinderGeometry(
        b.radius - 0.012,
        b.bottomRadius - 0.012,
        b.height - 0.05,
        48,
        1,
        true,
      ),
      new T.MeshStandardMaterial({
        color: '#64776e',
        transparent: true,
        opacity: 0.24,
        side: T.DoubleSide,
        roughness: 0.65,
      }),
    );
    side.position.y = b.height / 2;
    g.add(side);
    const linePoints: T.Vector3[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i * Math.PI * 2) / 40;
      linePoints.push(
        new T.Vector3(
          Math.cos(angle) * b.bottomRadius,
          0.04,
          Math.sin(angle) * b.bottomRadius,
        ),
        new T.Vector3(
          Math.cos(angle) * b.radius,
          b.height,
          Math.sin(angle) * b.radius,
        ),
      );
    }
    for (let row = 1; row < 15; row++) {
      const y = (row * b.height) / 15,
        r = b.bottomRadius + ((b.radius - b.bottomRadius) * y) / b.height;
      for (let i = 0; i < 64; i++) {
        const a = (i * Math.PI * 2) / 64,
          n = ((i + 1) * Math.PI * 2) / 64;
        linePoints.push(
          new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          new T.Vector3(Math.cos(n) * r, y, Math.sin(n) * r),
        );
      }
    }
    g.add(
      new T.LineSegments(
        new T.BufferGeometry().setFromPoints(linePoints),
        new T.LineBasicMaterial({ color: '#84928a' }),
      ),
    );
  } else {
    const shell = new T.Mesh(
      new T.LatheGeometry(points, 64),
      mat('#ad9170', 0.72),
    );
    shell.castShadow = true;
    g.add(shell);
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI * 2) / 48;
      const slat = box(
        g,
        0.026,
        b.height - 0.04,
        0.038,
        Math.cos(a) * (b.radius - 0.025),
        b.height / 2,
        Math.sin(a) * (b.radius - 0.025),
        mat(i % 3 === 0 ? '#ae926f' : '#c4ad86'),
        0.009,
      );
      slat.rotation.y = -a;
      slat.rotation.z = Math.cos(a) * -0.095;
      slat.rotation.x = Math.sin(a) * 0.095;
    }
  }
  cylinder(
    g,
    b.bottomRadius - 0.02,
    b.bottomRadius - 0.02,
    0.04,
    0,
    0.04,
    0,
    inside,
    48,
  );
  for (const [radius, y, tube] of [
    [b.radius, b.height, b.rim],
    [b.bottomRadius, 0.035, 0.018],
  ]) {
    const ring = new T.Mesh(new T.TorusGeometry(radius, tube, 10, 64), dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    g.add(ring);
  }
  return g;
}
export function makePaper(seed = 1) {
  const geo = new T.IcosahedronGeometry(0.095, 2);
  const pos = geo.attributes.position;
  const v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 83 + seed) *
      Math.cos(v.y * 71 - seed) *
      Math.sin(v.z * 97 + seed);
    v.multiplyScalar(1 + n * 0.18);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const c = new T.Color('#eeeedd');
    c.multiplyScalar(
      0.86 +
        0.14 * (0.5 + 0.5 * Math.sin(pos.getX(i) * 120 + pos.getY(i) * 40)),
    );
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const mesh = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      color: '#fffef3',
      vertexColors: true,
      roughness: 0.96,
      flatShading: true,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function createOffice(scene: T.Scene): Room {
  const group = new T.Group();
  scene.add(group);
  scene.background = new T.Color('#9fafa3');
  scene.fog = new T.Fog('#9fafa3', 17, 39);
  const carpet = mat('#46685a');
  carpet.map = noiseTexture('#46685a', 'carpet');
  box(group, 24, 0.12, 30, 0, -0.07, -5, carpet);
  const wall = mat('#c7d2bd');
  box(group, 24, 4.4, 0.18, 0, 2.2, -12, wall);
  box(group, 0.18, 4.4, 30, -10, 2.2, -5, wall);
  box(group, 0.18, 4.4, 30, 10, 2.2, -5, wall);
  box(group, 24, 0.14, 30, 0, 4.4, -5, mat('#b8c2ad')).castShadow = false;
  const grid = mat('#8e9e90');
  for (let x = -10; x <= 10; x += 2) {
    box(group, 0.025, 0.024, 28, x, 4.305, -4, grid);
  }
  for (let z = -16; z <= 8; z += 2) {
    box(group, 24, 0.024, 0.025, 0, 4.305, z, grid);
  }
  const fluorescent = new T.MeshStandardMaterial({
    color: '#ffffe2',
    emissive: '#f4ffe0',
    emissiveIntensity: 1.15,
    roughness: 0.3,
  });
  for (let x = -8; x <= 8; x += 4) {
    for (let z = -10; z <= 6; z += 4) {
      box(group, 1.53, 0.025, 0.65, x, 4.27, z, mat('#a2b39f'));
      box(group, 1.43, 0.029, 0.54, x, 4.25, z, fluorescent);
    }
  }
  box(group, 24, 0.12, 0.07, 0, 0.12, -11.87, mat('#5c7467'));
  for (let x = -9; x <= 9; x += 3)
    box(group, 0.025, 4.2, 0.02, x, 2.1, -11.89, mat('#aebfae'));
  box(group, 2.2, 2.8, 0.16, 5.4, 1.4, -11.8, mat('#58776d'));
  box(group, 1.95, 2.55, 0.04, 5.4, 1.33, -11.69, mat('#31594f'));
  box(group, 0.08, 0.23, 0.06, 6.1, 1.12, -11.63, mat('#bdc4b3', 0.4, 0.5));
  label(group, 'MDR', 0.5, 0.16, 5.4, 2.05, -11.65, '#cbd4bd');
  label(
    group,
    'LUMON',
    3.3,
    0.85,
    -0.6,
    2.62,
    -11.87,
    '#3d635b',
    'transparent',
    'italic 94px Georgia',
  );
  label(
    group,
    'INDUSTRIES',
    1.65,
    0.25,
    -0.6,
    2.09,
    -11.85,
    '#5d7b6a',
    'transparent',
    '500 35px Arial',
  );
  const logo = new T.Mesh(
    new T.TorusGeometry(0.53, 0.012, 6, 64),
    mat('#638374'),
  );
  logo.position.set(-2.85, 2.61, -11.86);
  logo.scale.y = 0.65;
  group.add(logo);
  for (const x of [-3.65, 3.65])
    for (const z of [-3.15, -6.8]) {
      desk(group, x, z, x > 0 ? -0.11 : 0.11);
      chair(group, x - 0.38, z + 1.24, x > 0 ? 0.2 : -0.2);
    }
  // Low green partitions, with a clear central throwing lane.
  const partition = mat('#6e9281');
  for (const x of [-3.65, 3.65]) {
    box(group, 2.75, 1.1, 0.09, x, 0.57, -4.03, partition);
    box(group, 2.78, 0.045, 0.105, x, 1.13, -4.03, mat('#adc1aa'));
  }
  desk(group, -4.2, 2.1, 0.22);
  chair(group, -4.25, 3.35, 0.18);
  desk(group, 4.6, 1.1, -0.18);
  chair(group, 4.55, 2.45, -0.35);
  // Archive cabinets behind the right workstation.
  for (let i = 0; i < 3; i++) {
    box(
      group,
      0.86,
      1.58,
      0.65,
      7.5 + i * 0.9,
      0.8,
      -10.75,
      mat('#9aaa96'),
      0.025,
    );
    for (let j = 0; j < 4; j++) {
      box(
        group,
        0.74,
        0.31,
        0.012,
        7.5 + i * 0.9,
        0.22 + j * 0.37,
        -10.41,
        mat('#a9b8a3'),
      );
      box(
        group,
        0.2,
        0.032,
        0.027,
        7.5 + i * 0.9,
        0.23 + j * 0.37,
        -10.39,
        mat('#536f61', 0.5, 0.4),
      );
    }
  }
  const face = cylinder(
    group,
    0.28,
    0.28,
    0.025,
    -5.2,
    2.75,
    -11.86,
    mat('#e7ead7'),
    48,
  );
  face.rotation.x = Math.PI / 2;
  box(group, 0.015, 0.16, 0.015, -5.2, 2.82, -11.83, mat('#315143'));
  const hand = box(
    group,
    0.12,
    0.014,
    0.015,
    -5.145,
    2.75,
    -11.82,
    mat('#315143'),
  );
  hand.rotation.z = 0.15;
  const bin = makeBasket(1);
  group.add(bin);
  const hemi = new T.HemisphereLight('#ebf2d8', '#4b6659', 2);
  group.add(hemi);
  const light = new T.DirectionalLight('#edf5d6', 3.1);
  light.position.set(-3, 7, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, {
    left: -10,
    right: 10,
    top: 12,
    bottom: -10,
    near: 0.5,
    far: 28,
  });
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.025;
  group.add(light);
  group.add(light.target);
  const obstacles: Obstacle[] = [
    { min: new T.Vector3(-12, 4.31, -20), max: new T.Vector3(12, 4.55, 10) },
  ];
  for (const x of [-3.65, 3.65])
    for (const z of [-3.15, -6.8])
      obstacles.push({
        min: new T.Vector3(x - 1.3, 0.76, z - 0.65),
        max: new T.Vector3(x + 1.3, 0.88, z + 0.65),
      });
  obstacles.push({
    min: new T.Vector3(-12, 0, -12.1),
    max: new T.Vector3(12, 4.4, -11.85),
  });
  return { group, bin, obstacles, animate: () => {} };
}
function palm(g: T.Group, x: number, z: number, height: number, small = false) {
  const trunk = mat('#8b7653');
  const path = new T.CatmullRomCurve3([
    new T.Vector3(x, 0, z),
    new T.Vector3(x + 0.12, height * 0.4, z),
    new T.Vector3(x - 0.22, height, z + 0.06),
  ]);
  const stem = new T.Mesh(
    new T.TubeGeometry(path, 12, small ? 0.036 : 0.09, 8, false),
    trunk,
  );
  stem.castShadow = true;
  g.add(stem);
  const leaves = mat(small ? '#365841' : '#417850');
  leaves.side = T.DoubleSide;
  for (let j = 0; j < 9; j++) {
    const a = (j * Math.PI * 2) / 9,
      length = small ? 0.95 : 2.5;
    const positions: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12,
        reach = length * t,
        w = Math.sin(t * Math.PI) * length * 0.115;
      const y =
        height + Math.sin(t * Math.PI) * length * 0.25 - t * t * length * 0.37;
      const px = x - 0.22 + Math.sin(a) * reach,
        pz = z + 0.06 + Math.cos(a) * reach;
      positions.push(
        px + Math.cos(a) * w,
        y,
        pz - Math.sin(a) * w,
        px - Math.cos(a) * w,
        y,
        pz + Math.sin(a) * w,
      );
      if (i < 12) {
        const q = i * 2;
        indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, leaves);
    mesh.castShadow = true;
    g.add(mesh);
  }
}
function sofa(g: T.Group, x: number, z: number, rotation: number, width = 3.5) {
  const t = new T.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotation;
  g.add(t);
  const cloth = mat('#eee8d6');
  cloth.map = noiseTexture('#eee8d6', 'fabric');
  const piping = mat('#d6cdb8');
  box(t, width, 0.24, 1.16, 0, 0.23, 0, mat('#b7a98c'), 0.09);
  box(t, width, 0.42, 1.22, 0, 0.46, 0, cloth, 0.15);
  box(t, width, 0.56, 0.3, 0, 0.87, -0.48, cloth, 0.14);
  for (const side of [-1, 1])
    box(t, 0.35, 0.57, 1.2, side * (width / 2 - 0.11), 0.65, 0, cloth, 0.15);
  const count = 3;
  for (let i = 0; i < count; i++) {
    const px = -width * 0.31 + i * width * 0.31;
    box(t, width * 0.3, 0.2, 0.86, px, 0.74, 0.11, cloth, 0.095);
    box(t, width * 0.295, 0.028, 0.7, px, 0.645, 0.1, piping, 0.01);
    const cushion = box(
      t,
      width * 0.3,
      0.43,
      0.24,
      px,
      0.99,
      -0.3,
      cloth,
      0.105,
    );
    cushion.rotation.x = -0.16;
  }
  for (const [px, pz, angle, color] of [
    [-width * 0.32, 0.08, -0.26, '#bea777'],
    [width * 0.32, -0.1, 0.24, '#6f8578'],
  ] as [number, number, number, string][]) {
    const pillow = box(t, 0.44, 0.43, 0.17, px, 0.99, pz, mat(color), 0.085);
    pillow.rotation.z = angle;
    pillow.rotation.x = -0.14;
  }
  return t;
}
export function createBeach(scene: T.Scene): Room {
  const group = new T.Group();
  scene.add(group);
  scene.background = new T.Color('#b8dce0');
  scene.fog = new T.Fog('#c9e5e4', 55, 150);
  const oak = mat('#cbb793', 0.72);
  oak.map = noiseTexture('#cbb793', 'wood');
  box(group, 23, 0.14, 23, 0, -0.085, -2, oak);
  const seam = mat('#b7a382');
  for (let x = -11; x <= 11; x += 0.55) {
    box(group, 0.007, 0.003, 21, x, -0.009, -2, seam);
    for (let z = -12 + (Math.round(x * 2) % 3) * 1.3; z < 9; z += 4)
      box(group, 0.55, 0.003, 0.007, x + 0.27, -0.009, z, seam);
  }
  const plaster = mat('#ebe3d0');
  box(group, 24, 0.2, 18, 0, 6.6, 1, plaster);
  box(group, 0.2, 6.5, 24, -10, 3.25, -3, plaster);
  box(group, 0.2, 6.5, 24, 10, 3.25, -3, plaster);
  // A full-height wall of glass: slim bronze mullions leave the ocean in view.
  const bronze = mat('#695b43', 0.4, 0.6);
  box(group, 20, 0.2, 0.23, 0, 6.3, -8, bronze);
  box(group, 20, 0.12, 0.26, 0, 0.04, -8, bronze);
  for (let x = -10; x <= 10; x += 3.34) {
    box(group, 0.08, 6.25, 0.14, x, 3.15, -8, bronze);
    const glass = new T.Mesh(
      new T.PlaneGeometry(3.25, 6.15),
      new T.MeshPhysicalMaterial({
        color: '#d7eef0',
        transparent: true,
        opacity: 0.045,
        roughness: 0.05,
        metalness: 0.2,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    glass.position.set(x + 1.66, 3.15, -7.995);
    group.add(glass);
  }
  box(group, 20, 0.06, 0.13, 0, 4.85, -7.98, bronze);
  // Deep terrace, sand, and moving ribbons of shallow water beyond the windows.
  box(group, 38, 0.12, 6, 0, -0.11, -11.2, mat('#d8ccb0'));
  for (let x = -18; x <= 18; x += 1.5)
    box(group, 0.016, 0.003, 6, x, -0.043, -11.2, mat('#b6ae94'));
  const sand = mat('#e7d6aa');
  box(group, 150, 0.12, 17, 0, -0.24, -21, sand);
  const ocean = new T.Mesh(
    new T.PlaneGeometry(240, 180, 1, 1),
    mat('#59b8bb', 0.32, 0.14),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.255, -115);
  group.add(ocean);
  const shallow = new T.Mesh(
    new T.PlaneGeometry(150, 15),
    new T.MeshStandardMaterial({
      color: '#8cd3c5',
      roughness: 0.32,
      transparent: true,
      opacity: 0.9,
    }),
  );
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.set(0, -0.19, -34);
  group.add(shallow);
  const waves: T.Mesh[] = [];
  for (let j = 0; j < 11; j++) {
    const wave = new T.Mesh(
      new T.PlaneGeometry(140, 0.05 + j * 0.045, 80, 1),
      new T.MeshBasicMaterial({
        color: '#effaf1',
        transparent: true,
        opacity: 0.21 + (j % 3) * 0.055,
        depthWrite: false,
      }),
    );
    wave.rotation.x = -Math.PI / 2;
    wave.position.set(0, -0.175, -28 - j * 4.8);
    waves.push(wave);
    group.add(wave);
  }
  const sun = new T.Mesh(
    new T.SphereGeometry(4, 24, 16),
    new T.MeshBasicMaterial({ color: '#fff8d9', fog: false }),
  );
  sun.position.set(45, 23, -130);
  group.add(sun);
  for (let i = 0; i < 5; i++) {
    const hill = new T.Mesh(new T.SphereGeometry(1, 20, 12), mat('#7dadac'));
    hill.position.set(-61 + i * 8, 1, -105 - i * 3);
    hill.scale.set(18, 3 + Math.sin(i) * 2, 6);
    group.add(hill);
  }
  palm(group, -11, -20, 6.8);
  palm(group, 12, -19, 7.8);
  palm(group, 17, -25, 6.7);
  // Sculptural upholstered seating around low travertine tables.
  const rug = mat('#dfd6c1');
  rug.map = noiseTexture('#ded5c2', 'fabric');
  box(group, 9.4, 0.019, 6.1, 0.1, 0.009, -1.1, rug, 0.08);
  for (const side of [-1, 1])
    box(
      group,
      9.15,
      0.002,
      0.018,
      0.1,
      0.021,
      -1.1 + side * 2.85,
      mat('#c6bda7'),
    );
  sofa(group, -3.45, -1.65, 0.28, 3.8);
  sofa(group, 3.55, -4.2, -0.36, 3.7);
  const stone = mat('#c3b08b');
  stone.map = noiseTexture('#c9b999', 'wood');
  const table = new T.Group();
  table.position.set(-2.4, 0, 0.4);
  group.add(table);
  cylinder(table, 0.78, 0.91, 0.17, 0, 0.47, 0, stone, 64);
  cylinder(table, 0.49, 0.55, 0.36, 0, 0.23, 0, stone, 48);
  const tray = cylinder(
    table,
    0.27,
    0.27,
    0.025,
    0.16,
    0.565,
    0,
    mat('#584b37'),
    40,
  );
  box(table, 0.36, 0.055, 0.27, -0.25, 0.583, 0.07, mat('#f0e5d0'), 0.01);
  box(table, 0.31, 0.036, 0.24, -0.24, 0.629, 0.08, mat('#7c8975'), 0.01);
  cylinder(table, 0.08, 0.08, 0.13, 0.18, 0.64, 0.02, mat('#e7dbc1'), 32);
  const side = new T.Group();
  side.position.set(5.2, 0, -1.5);
  group.add(side);
  cylinder(side, 0.49, 0.49, 0.075, 0, 0.74, 0, mat('#816342'), 48);
  cylinder(side, 0.07, 0.11, 0.71, 0, 0.37, 0, bronze);
  cylinder(side, 0.35, 0.35, 0.04, 0, 0.035, 0, bronze);
  const vaseMat = mat('#c4a678');
  cylinder(side, 0.09, 0.15, 0.35, 0, 0.94, 0, vaseMat);
  for (let i = 0; i < 5; i++) {
    const branch = box(
      side,
      0.012,
      0.7,
      0.012,
      Math.sin(i) * 0.12,
      1.38,
      Math.cos(i) * 0.08,
      mat('#5c6d3a'),
    );
    branch.rotation.z = Math.sin(i) * 0.27;
  }
  // Timber feature wall and a high suspended ring chandelier.
  for (let z = -7; z < 5; z += 0.22)
    box(group, 0.08, 6.35, 0.095, -9.83, 3.2, z, mat('#997d59'));
  const hanging = new T.Group();
  hanging.position.set(-2.3, 4.4, -1.4);
  group.add(hanging);
  for (const [r, y] of [
    [1.05, 0],
    [0.68, 0.35],
  ]) {
    const ring = new T.Mesh(new T.TorusGeometry(r, 0.035, 12, 80), bronze);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    hanging.add(ring);
    const diffuser = new T.Mesh(
      new T.TorusGeometry(r, 0.017, 8, 80),
      new T.MeshStandardMaterial({
        color: '#fff1c8',
        emissive: '#ffdfa0',
        emissiveIntensity: 1.5,
      }),
    );
    diffuser.rotation.x = Math.PI / 2;
    diffuser.position.y = y - 0.025;
    hanging.add(diffuser);
  }
  for (const x of [-0.7, 0.7])
    box(hanging, 0.009, 2.1, 0.009, x, 1.05, 0, bronze);
  cylinder(group, 0.34, 0.27, 0.64, -6.4, 0.32, -5.9, mat('#cbbfa5'));
  palm(group, -6.4, -5.9, 2.65, true);
  // Sheer curtains gather at the edges, making the room feel tall and lived in.
  const sheer = new T.MeshStandardMaterial({
    color: '#f5eee0',
    transparent: true,
    opacity: 0.55,
    side: T.DoubleSide,
    roughness: 1,
  });
  for (const side of [-1, 1])
    for (let j = 0; j < 8; j++) {
      const curtain = box(
        group,
        0.18,
        6.25,
        0.1,
        side * (8.5 + j * 0.14),
        3.16,
        -7.74 + Math.sin(j) * 0.09,
        sheer,
        0.04,
      );
      curtain.castShadow = false;
    }
  const bin = makeBasket(2);
  group.add(bin);
  group.add(new T.HemisphereLight('#f5f6e6', '#9a9270', 2.5));
  const sunlight = new T.DirectionalLight('#fff0cf', 4.8);
  sunlight.position.set(9, 9, -20);
  sunlight.target.position.set(-2, 0, 3);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, {
    left: -13,
    right: 13,
    top: 13,
    bottom: -13,
    near: 0.5,
    far: 42,
  });
  sunlight.shadow.bias = -0.00035;
  sunlight.shadow.normalBias = 0.025;
  group.add(sunlight, sunlight.target);
  const fill = new T.DirectionalLight('#dcecf0', 0.75);
  fill.position.set(-5, 5, 5);
  group.add(fill);
  const obstacles: Obstacle[] = [
    {
      min: new T.Vector3(-5.35, 0.25, -2.5),
      max: new T.Vector3(-1.55, 1.1, -1.05),
    },
    { min: new T.Vector3(1.7, 0.25, -4.9), max: new T.Vector3(5.4, 1.1, -3.5) },
    {
      min: new T.Vector3(-3.3, 0.38, -0.5),
      max: new T.Vector3(-1.5, 0.57, 1.3),
    },
    { min: new T.Vector3(-10, 0, -8.05), max: new T.Vector3(10, 6.5, -7.95) },
  ];
  return {
    group,
    bin,
    obstacles,
    animate: (time: number) => {
      waves.forEach((wave, i) => {
        wave.position.z = -28 - i * 4.8 + Math.sin(time * 0.34 + i) * 0.6;
        wave.position.y = -0.174 + Math.sin(time * 0.3 + i) * 0.006;
        (wave.material as T.MeshBasicMaterial).opacity =
          0.2 + Math.sin(time * 0.6 + i) * 0.09;
      });
    },
  };
}
export function disposeRoom(group: T.Object3D) {
  const materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  group.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.LineSegments) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
    if (o instanceof T.Light && 'shadow' in o)
      (o as T.DirectionalLight).shadow?.map?.dispose();
  });
  for (const m of materials) {
    for (const v of Object.values(m))
      if (v instanceof T.Texture) textures.add(v);
    m.dispose();
  }
  for (const t of textures) t.dispose();
  group.removeFromParent();
}
