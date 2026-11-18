// 3D 방해꾼 동물 장면(ui-pest-character spec "배치와 그리기", ui-pest-skin spec "생김새와 물건 놀이").
// three.js는 이 파일에서만 import한다. 풀이 화면에서 동적 import()로 따로 불러와 첫 화면 번들에 들어가지 않게 한다.
// 카메라·바닥·그림자·크기 맞추기는 모든 동물이 같고, 몸(만들기 함수)만 동물마다 다르다.
import {
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three';
import type { PestBehavior, PestMood } from '../lib/pest.ts';
import { depthScale, type Area } from '../lib/pestMotion.ts';
import type { PetId } from '../types/settings.ts';

/** 한 프레임에 그릴 동물 상태. x·y는 놀이 영역 px(발밑), hop은 걸음으로 뜬 높이(px). */
export type PetPose = {
  x: number;
  y: number;
  hop: number;
  /** 바라보는 방향(라디안, 0 = 화면 쪽). */
  facing: number;
  behavior: PestBehavior;
  mood: PestMood;
  dizzy: boolean;
  /** 장면이 시작된 뒤 시간(초), 지금 반응이 시작된 뒤 시간(초). */
  time: number;
  moodTime: number;
  reducedMotion: boolean;
  /** 놀이터에서 멈춰 두리번거리는 중(물건 놀이). */
  resting: boolean;
};

/** 동물 장면. 놀이 영역 크기가 바뀌면 resize, 화면을 떠나면 dispose. */
export type PetScene = {
  render: (pose: PetPose) => void;
  resize: (area: Area) => void;
  dispose: () => void;
};

/** 자세 값(반응·행동·물건 놀이별 귀·머리·몸·꼬리 움직임). 모두 라디안 또는 배율. */
export type PetPoseParams = {
  /** 귀 앞쪽으로 숙임(0 = 쫑긋, 클수록 처짐). */
  earDroop: number;
  /** 귀 좌우 벌어짐. */
  earSpread: number;
  /** 몸 한 바퀴 돌기(y축 추가 회전). */
  spin: number;
  /** 고개 숙임. */
  headTilt: number;
  /** 몸 좌우 흔들림(z축). */
  wobble: number;
  /** 눈 크기 배율. */
  eyeScale: number;
  /** 발 버둥(앞뒤 흔들림). */
  kick: number;
  /** 꼬리 좌우 흔들기(라디안). */
  tailWag: number;
  /** 물건 놀이 정도(-1~1, 0이면 놀지 않음). */
  toyPlay: number;
};

/** 동물마다 꼬리를 흔드는 빠르기·폭(라디안). 토끼는 꼬리가 짧아 흔들지 않는다. */
const TAIL_WAG: Record<PetId, { speed: number; size: number }> = {
  rabbit: { speed: 0, size: 0 },
  dog: { speed: 12, size: 0.5 },
  cat: { speed: 2.2, size: 0.35 },
  squirrel: { speed: 3, size: 0.15 },
};

/**
 * 반응·행동·물건 놀이별 자세(순수 계산). 움직임 줄이기면 반복 움직임 없이 반응 모양만.
 * 물건 놀이는 놀이터에서 쉬는 동안(resting)만, 반응·끌기·어지러움 중에는 하지 않는다.
 */
export function petPoseParams({
  animal,
  mood,
  behavior,
  dizzy,
  time,
  moodTime,
  reducedMotion,
  resting,
}: Omit<PetPose, 'x' | 'y' | 'hop' | 'facing'> & {
  animal: PetId;
}): PetPoseParams {
  const wave = (speed: number): number =>
    reducedMotion ? 0 : Math.sin(time * speed);
  const tail = TAIL_WAG[animal];
  const params: PetPoseParams = {
    earDroop: 0.15 + 0.08 * wave(3),
    earSpread: 0.18,
    spin: 0,
    headTilt: 0,
    wobble: 0,
    eyeScale: 1,
    kick: 0,
    tailWag: tail.size * wave(tail.speed),
    toyPlay: 0,
  };
  switch (mood) {
    case 'smug':
      params.earSpread = 0.3 + 0.15 * wave(6);
      params.headTilt = -0.15;
      // 신나서 꼬리를 더 크게 흔든다.
      params.tailWag = tail.size * 1.4 * wave(tail.speed * 1.3);
      break;
    case 'taunt':
      // 0.8초 동안 폴짝 한 바퀴.
      params.spin = reducedMotion
        ? 0
        : Math.min(1, moodTime / 0.8) * Math.PI * 2;
      params.earSpread = 0.35;
      break;
    case 'sulky':
      params.earDroop = 1.25;
      params.headTilt = 0.35;
      // 시무룩: 꼬리가 멈춘다.
      params.tailWag = 0;
      break;
    case 'surprised':
      params.earDroop = -0.1;
      params.earSpread = 0.05;
      params.eyeScale = 1.6;
      break;
    case 'idle':
      break;
  }
  if (behavior === 'dragged') {
    params.kick = 0.6 * wave(18);
    params.wobble = 0.25 * wave(5);
  }
  if (dizzy) {
    params.wobble = 0.3 * wave(9);
    params.headTilt = 0.2 * wave(7);
    params.eyeScale = 0.7;
  }
  if (
    resting &&
    mood === 'idle' &&
    behavior === 'roaming' &&
    !dizzy &&
    !reducedMotion
  ) {
    params.toyPlay = Math.sin(time * 6);
  }
  return params;
}

// 동물 모델이 화면에서 차지하는 높이(바닥에서 1 높이를 기준으로 한 배수). 귀 끝까지의 높이와
// 비스듬한 카메라에서 몸 앞뒤 길이가 위아래로 보이는 만큼을 더한 값(브라우저에서 맞춤).
const VISUAL_HEIGHT = 2.3;

// 모델 중심에서 앞발·그림자 앞쪽 끝까지 거리(높이 1 기준).
const FRONT_OFFSET = 0.35;

// 카메라: 위에서 비스듬히(약 58도) 내려다본다. 바닥은 y = 0 평면.
const CAMERA = { fov: 38, tilt: (58 * Math.PI) / 180, distance: 10 };

/**
 * 캔버스에 고른 동물의 장면을 만든다. WebGL을 쓸 수 없으면 예외를 던진다(부르는 쪽이 2D로 대신).
 * 그리는 중에 브라우저가 WebGL을 끊으면(context lost) onContextLost를 부른다.
 */
export function createPetScene({
  canvas,
  area,
  animal,
  onContextLost,
}: {
  canvas: HTMLCanvasElement;
  area: Area;
  animal: PetId;
  onContextLost?: () => void;
}): PetScene {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  const handleLost = (event: Event): void => {
    event.preventDefault();
    onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', handleLost);
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0xd8c8b8, 2.2));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 6, 4);
  scene.add(sun);

  const camera = new PerspectiveCamera(CAMERA.fov, 1, 0.1, 100);
  camera.position.set(
    0,
    Math.sin(CAMERA.tilt) * CAMERA.distance,
    Math.cos(CAMERA.tilt) * CAMERA.distance,
  );
  camera.lookAt(0, 0, 0);
  // 광선 판정·투영이 첫 그리기 전에도 맞도록 카메라 행렬을 바로 갱신한다
  // (갱신하지 않으면 원점에서 쏜 광선이 화면 위쪽에서 바닥을 못 맞혀 영영 그려지지 않음).
  camera.updateMatrixWorld();

  const parts = BUILDERS[animal]();
  const shadow = buildShadow();
  scene.add(shadow, parts.root);

  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hit = new Vector3();
  const head = new Vector3();
  let size: Area = area;

  // 화면 점(px) → 바닥 위 점. 발밑이 정확히 그 화면 점에 보이게 한다.
  const floorAt = (x: number, y: number): Vector3 | undefined => {
    ndc.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(floor, hit) ?? undefined;
  };

  // 그 자리에서 동물(높이 1)이 화면에 몇 px로 보이는지.
  const pixelsPerUnit = (feet: Vector3): number => {
    const a = feet.clone().project(camera);
    head
      .copy(feet)
      .setY(feet.y + 1)
      .project(camera);
    return Math.abs(head.y - a.y) * (size.height / 2);
  };

  const resize = (next: Area): void => {
    size = next;
    renderer.setSize(next.width, next.height, false);
    camera.aspect = next.width / Math.max(1, next.height);
    camera.updateProjectionMatrix();
  };
  resize(area);

  const render = (pose: PetPose): void => {
    const feet = floorAt(pose.x, pose.y);
    if (!feet) return;
    // 화면 크기를 spec(위 56px ~ 아래 96px)에 맞춘다.
    const ppu = pixelsPerUnit(feet);
    const scale = depthScale({ y: pose.y, area: size }) / (ppu * VISUAL_HEIGHT);
    // 걸음으로 뜬 높이(px)를 바닥 위 높이로.
    const lift = pose.hop / ppu;
    const p = petPoseParams({ ...pose, animal });

    // 내려다보는 카메라라 몸이 발밑 점 둘레에 그려진다. 앞발 끝이 발밑 점에 오도록 뒤로 민다
    // (잡는 영역은 발밑 점 위쪽 크기만큼이다).
    const back = feet.z - FRONT_OFFSET * scale;
    parts.root.position.set(feet.x, lift, back);
    parts.root.scale.setScalar(scale);
    parts.root.rotation.set(0, pose.facing + p.spin, p.wobble);
    parts.head.rotation.set(p.headTilt, 0, 0);
    const [earLeft, earRight] = parts.ears;
    earLeft?.rotation.set(p.earDroop, 0, p.earSpread);
    earRight?.rotation.set(p.earDroop, 0, -p.earSpread);
    for (const eye of parts.eyes) eye.scale.setScalar(p.eyeScale);
    parts.feet.forEach((foot, index) => {
      foot.rotation.x = (index % 2 === 0 ? 1 : -1) * p.kick;
    });
    if (parts.tail) parts.tail.rotation.y = p.tailWag;
    playWithToy({ parts, play: p.toyPlay, time: pose.time });

    // 그림자: 바닥에 붙어 있고 뛰어오를수록 작고 옅어진다.
    const air = Math.min(1, lift / (scale * 0.5));
    shadow.position.set(feet.x, 0.002, back);
    shadow.scale.setScalar(scale * (1 - 0.4 * air));
    (shadow.material as MeshBasicMaterial).opacity = 0.28 * (1 - 0.5 * air);

    renderer.render(scene, camera);
  };

  const dispose = (): void => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        (object.geometry as BufferGeometry).dispose();
        const material = object.material as Material | Material[];
        for (const m of Array.isArray(material) ? material : [material]) {
          m.dispose();
        }
      }
    });
    canvas.removeEventListener('webglcontextlost', handleLost);
    renderer.dispose();
    // 스테이지마다 새 캔버스를 만들므로 WebGL 연결을 바로 끊는다(연결 수 제한에 걸리지 않게).
    renderer.forceContextLoss();
  };

  return { render, resize, dispose };
}

/** 물건으로 노는 방식: 당근 오물오물, 뼈다귀 흔들기, 털실 공 굴리기, 도토리 돌리기. */
type ToyMotion = 'nibble' | 'shake' | 'roll' | 'spin';

/** 동물 모델 부품(높이 약 1, 화면 쪽 +z를 바라봄). */
type PetParts = {
  root: Group;
  head: Group;
  eyes: Mesh[];
  /** 귀 피벗(왼쪽, 오른쪽). 뿌리에서 돈다. */
  ears: Group[];
  feet: Mesh[];
  /** 꼬리 피벗(좌우로 흔든다). */
  tail: Group | undefined;
  toy: Group;
  toyMotion: ToyMotion;
};

// 물건 놀이: 쉬는 동안 play(-1~1)에 맞춰 물건·머리를 움직인다. 놀지 않으면(0) 처음 자리.
function playWithToy({
  parts,
  play,
  time,
}: {
  parts: PetParts;
  play: number;
  time: number;
}): void {
  const { toy, head } = parts;
  const base = toy.userData as { z: number; y: number };
  toy.position.z = base.z;
  toy.position.y = base.y;
  toy.rotation.set(0, 0, 0);
  if (play === 0) return;
  switch (parts.toyMotion) {
    case 'nibble':
      // 고개를 까딱이며 당근을 오물오물.
      head.rotation.x += 0.12 * Math.abs(play);
      toy.rotation.x = 0.2 * play;
      break;
    case 'shake':
      // 뼈다귀를 문 채 고개를 좌우로 흔든다.
      head.rotation.y = 0.35 * play;
      break;
    case 'roll':
      // 털실 공을 앞발 앞에서 앞뒤로 굴린다.
      toy.position.z = base.z + 0.1 * play;
      toy.rotation.x = time * 6;
      break;
    case 'spin':
      // 도토리를 앞발로 빙글빙글 돌린다.
      toy.rotation.y = time * 5;
      toy.position.y = base.y + 0.02 * Math.abs(play);
      break;
  }
}

// 재료·도형 도우미.
function material(color: string, roughness = 0.85): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(color), roughness });
}

function ball(radius: number, mat: Material): Mesh {
  return new Mesh(new SphereGeometry(radius, 24, 16), mat);
}

// 장난감은 처음 자리를 기억해 둔다(놀이가 끝나면 돌아오게).
function placeToy(toy: Group, x: number, y: number, z: number): Group {
  toy.position.set(x, y, z);
  toy.userData = { y, z };
  return toy;
}

// 공통 몸통: 몸·발 4개. 동물마다 색·크기만 다르다.
function buildBody({
  root,
  fur,
  body,
  feet,
}: {
  root: Group;
  fur: Material;
  body: { radius: number; scale: [number, number, number]; y: number };
  feet: { radius: number; spread: number };
}): Mesh[] {
  const trunk = ball(body.radius, fur);
  trunk.scale.set(...body.scale);
  trunk.position.set(0, body.y, 0);
  root.add(trunk);
  return [
    [-feet.spread * 0.7, 0.24],
    [feet.spread * 0.7, 0.24],
    [-feet.spread, -0.04],
    [feet.spread, -0.04],
  ].map(([x, z]) => {
    const foot = ball(feet.radius, fur);
    foot.scale.set(0.9, 0.6, 1.4);
    foot.position.set(x!, 0.05, z!);
    root.add(foot);
    return foot;
  });
}

// 공통 얼굴: 눈 2개·코·볼.
function buildFace({
  head,
  eyeColor,
  noseColor,
  cheekColor,
  z,
}: {
  head: Group;
  eyeColor: string;
  noseColor: string;
  cheekColor: string;
  z: number;
}): Mesh[] {
  const dark = material(eyeColor, 0.3);
  const eyes = [-0.09, 0.09].map((x) => {
    const eye = ball(0.035, dark);
    eye.position.set(x, 0.05, z);
    head.add(eye);
    return eye;
  });
  const nose = ball(0.028, material(noseColor, 0.5));
  nose.position.set(0, -0.02, z + 0.03);
  head.add(nose);
  for (const x of [-0.15, 0.15]) {
    const cheek = ball(0.04, material(cheekColor, 0.9));
    cheek.scale.set(1, 0.6, 0.4);
    cheek.position.set(x, -0.04, z - 0.02);
    head.add(cheek);
  }
  return eyes;
}

// 토끼: 크림색, 긴 귀, 동그란 꼬리. 당근을 앞에 든다.
function buildRabbit(): PetParts {
  const fur = material('#f8f1e7');
  const inner = material('#ffb7c5', 0.9);
  const root = new Group();
  const feet = buildBody({
    root,
    fur,
    body: { radius: 0.3, scale: [1, 0.95, 1.1], y: 0.32 },
    feet: { radius: 0.08, spread: 0.18 },
  });
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.3, -0.33);
  tailPivot.add(ball(0.09, fur));
  root.add(tailPivot);

  const head = new Group();
  head.position.set(0, 0.68, 0.1);
  root.add(head);
  const skull = ball(0.24, fur);
  skull.scale.set(1.05, 0.95, 1);
  head.add(skull);
  const eyes = buildFace({
    head,
    eyeColor: '#2b2b2b',
    noseColor: '#ffb7c5',
    cheekColor: '#ffb7c5',
    z: 0.21,
  });
  const ears = [-1, 1].map((side) => {
    const pivot = new Group();
    pivot.position.set(0.09 * side, 0.18, -0.02);
    const outer = new Mesh(new CapsuleGeometry(0.065, 0.34, 6, 16), fur);
    outer.position.y = 0.22;
    const lining = new Mesh(new CapsuleGeometry(0.035, 0.28, 6, 12), inner);
    lining.position.set(0, 0.22, 0.04);
    pivot.add(outer, lining);
    head.add(pivot);
    return pivot;
  });

  // 당근: 주황 원뿔 + 초록 잎, 앞발 위에 비스듬히.
  const carrot = new Group();
  const root2 = new Mesh(
    new ConeGeometry(0.06, 0.26, 12),
    material('#ff9a4d', 0.7),
  );
  root2.rotation.x = Math.PI / 2;
  const leaf = new Mesh(new ConeGeometry(0.035, 0.1, 6), material('#7cc47a'));
  leaf.position.z = -0.15;
  leaf.rotation.x = -Math.PI / 2;
  carrot.add(root2, leaf);
  head.add(placeToy(carrot, 0, -0.16, 0.26));

  return {
    root,
    head,
    eyes,
    ears,
    feet,
    tail: tailPivot,
    toy: carrot,
    toyMotion: 'nibble',
  };
}

// 강아지: 연갈색, 처진 귀, 짧은 주둥이, 흔드는 꼬리. 뼈다귀를 입에 문다.
function buildDog(): PetParts {
  const fur = material('#e9c9a1');
  const dark = material('#b98a5e');
  const root = new Group();
  const feet = buildBody({
    root,
    fur,
    body: { radius: 0.3, scale: [1, 0.9, 1.25], y: 0.3 },
    feet: { radius: 0.085, spread: 0.18 },
  });
  const tail = new Group();
  tail.position.set(0, 0.42, -0.34);
  const tailMesh = new Mesh(new CapsuleGeometry(0.04, 0.2, 6, 10), fur);
  tailMesh.position.set(0, 0.08, -0.06);
  tailMesh.rotation.x = -0.9;
  tail.add(tailMesh);
  root.add(tail);

  const head = new Group();
  head.position.set(0, 0.64, 0.16);
  root.add(head);
  const skull = ball(0.23, fur);
  head.add(skull);
  const muzzle = ball(0.12, material('#f6e2c8'));
  muzzle.scale.set(1.1, 0.8, 1);
  muzzle.position.set(0, -0.07, 0.17);
  head.add(muzzle);
  const eyes = buildFace({
    head,
    eyeColor: '#2b2b2b',
    noseColor: '#3a2e2e',
    cheekColor: '#ffb7c5',
    z: 0.2,
  });
  // 처진 귀: 머리 옆에서 아래로 늘어진 큼직한 납작 캡슐(위에서 내려다봐도 보이게 바깥으로 벌림).
  const ears = [-1, 1].map((side) => {
    const pivot = new Group();
    pivot.position.set(0.17 * side, 0.12, 0.02);
    const ear = new Mesh(new CapsuleGeometry(0.095, 0.2, 6, 12), dark);
    ear.scale.set(1, 1, 0.5);
    ear.position.set(0.07 * side, -0.1, 0);
    ear.rotation.z = 0.55 * side;
    pivot.add(ear);
    head.add(pivot);
    return pivot;
  });

  // 뼈다귀: 가로 막대 + 양 끝 둥근 마디 둘씩, 입 앞에 가로로.
  const bone = new Group();
  const white = material('#fffaf0', 0.6);
  const stick = new Mesh(new CylinderGeometry(0.025, 0.025, 0.26, 10), white);
  stick.rotation.z = Math.PI / 2;
  bone.add(stick);
  for (const x of [-0.13, 0.13]) {
    for (const y of [-0.025, 0.025]) {
      const knob = ball(0.035, white);
      knob.position.set(x, y, 0);
      bone.add(knob);
    }
  }
  head.add(placeToy(bone, 0, -0.12, 0.28));

  return { root, head, eyes, ears, feet, tail, toy: bone, toyMotion: 'shake' };
}

// 고양이: 연회색, 뾰족한 세모 귀, 긴 꼬리. 털실 공을 앞발 앞에서 굴린다.
function buildCat(): PetParts {
  const fur = material('#d6d0e2');
  const inner = material('#ffc4d2', 0.9);
  const root = new Group();
  const feet = buildBody({
    root,
    fur,
    body: { radius: 0.27, scale: [0.95, 0.95, 1.25], y: 0.3 },
    feet: { radius: 0.07, spread: 0.15 },
  });
  const tail = new Group();
  tail.position.set(0, 0.3, -0.32);
  const tailMesh = new Mesh(new CapsuleGeometry(0.035, 0.42, 6, 10), fur);
  tailMesh.position.set(0, 0.2, -0.08);
  tailMesh.rotation.x = -0.35;
  tail.add(tailMesh);
  root.add(tail);

  const head = new Group();
  head.position.set(0, 0.64, 0.12);
  root.add(head);
  const skull = ball(0.22, fur);
  skull.scale.set(1.12, 0.95, 1);
  head.add(skull);
  const eyes = buildFace({
    head,
    eyeColor: '#2b2b2b',
    noseColor: '#ff9ebb',
    cheekColor: '#ffc4d2',
    z: 0.2,
  });
  const ears = [-1, 1].map((side) => {
    const pivot = new Group();
    pivot.position.set(0.13 * side, 0.15, 0);
    const outer = new Mesh(new ConeGeometry(0.08, 0.16, 4), fur);
    outer.position.y = 0.07;
    const lining = new Mesh(new ConeGeometry(0.045, 0.1, 4), inner);
    lining.position.set(0, 0.05, 0.03);
    pivot.add(outer, lining);
    head.add(pivot);
    return pivot;
  });

  // 털실 공: 분홍 공 + 감긴 실(고리 두 개), 앞발 앞 바닥에.
  const yarn = new Group();
  const pink = material('#ff9ebb', 0.9);
  yarn.add(ball(0.09, pink));
  const thread = material('#e86a93', 0.9);
  for (const angle of [0, Math.PI / 2]) {
    const loop = new Mesh(new TorusGeometry(0.09, 0.01, 6, 24), thread);
    loop.rotation.y = angle;
    yarn.add(loop);
  }
  root.add(placeToy(yarn, 0.02, 0.09, 0.42));

  return { root, head, eyes, ears, feet, tail, toy: yarn, toyMotion: 'roll' };
}

// 다람쥐: 주황 갈색, 작고 둥근 귀, 몸만 한 복슬 꼬리. 도토리를 앞발로 든다.
function buildSquirrel(): PetParts {
  const fur = material('#d99a62');
  const belly = material('#fbe6cc');
  const root = new Group();
  const feet = buildBody({
    root,
    fur,
    body: { radius: 0.26, scale: [0.95, 1.05, 1], y: 0.3 },
    feet: { radius: 0.065, spread: 0.15 },
  });
  const tummy = ball(0.17, belly);
  tummy.scale.set(1, 1.1, 0.6);
  tummy.position.set(0, 0.3, 0.18);
  root.add(tummy);
  // 복슬 꼬리: 등 뒤로 크게 말려 올라간 공 세 개.
  const tail = new Group();
  tail.position.set(0, 0.25, -0.28);
  [
    [0.17, 0, -0.05],
    [0.2, 0.25, -0.12],
    [0.16, 0.48, -0.05],
  ].forEach(([r, y, z]) => {
    const puff = ball(r!, fur);
    puff.position.set(0, y!, z!);
    tail.add(puff);
  });
  root.add(tail);

  const head = new Group();
  head.position.set(0, 0.66, 0.1);
  root.add(head);
  const skull = ball(0.2, fur);
  head.add(skull);
  const eyes = buildFace({
    head,
    eyeColor: '#2b2b2b',
    noseColor: '#3a2e2e',
    cheekColor: '#ffb7c5',
    z: 0.18,
  });
  const ears = [-1, 1].map((side) => {
    const pivot = new Group();
    pivot.position.set(0.11 * side, 0.15, 0);
    const ear = ball(0.06, fur);
    ear.scale.set(1, 1.2, 0.6);
    ear.position.y = 0.04;
    pivot.add(ear);
    head.add(pivot);
    return pivot;
  });

  // 도토리: 갈색 알 + 진한 갈색 깍정이·꼭지, 앞발 사이에.
  const acorn = new Group();
  const nut = ball(0.065, material('#c9874a', 0.6));
  nut.scale.set(1, 1.2, 1);
  const cap = ball(0.07, material('#7a5232'));
  cap.scale.set(1, 0.55, 1);
  cap.position.y = 0.06;
  const stem = new Mesh(
    new CylinderGeometry(0.01, 0.01, 0.04, 6),
    material('#5c3d24'),
  );
  stem.position.y = 0.11;
  acorn.add(nut, cap, stem);
  root.add(placeToy(acorn, 0, 0.42, 0.3));

  return { root, head, eyes, ears, feet, tail, toy: acorn, toyMotion: 'spin' };
}

// 바닥 그림자(모든 동물 같음).
function buildShadow(): Mesh {
  const shadow = new Mesh(
    new CircleGeometry(0.36, 32),
    new MeshBasicMaterial({
      color: new Color('#000000'),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

const BUILDERS: Record<PetId, () => PetParts> = {
  rabbit: buildRabbit,
  dog: buildDog,
  cat: buildCat,
  squirrel: buildSquirrel,
};
