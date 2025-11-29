// client/constants.js

const CONFIG = {
  // Configuración de la física
  GRAVITY: 0.35,
  JUMP_POWER: -8.8,
  PLAYER_SPEED: 2.2,
  WORLD_WIDTH: 960,
  WORLD_HEIGHT: 2400,
  BACKGROUND: {
    SKY_TOP: '#1a1a2e',
    SKY_BOTTOM: '#0f3460',
    PARALLAX_COLOR: '#53354a'
  },
  PLAYER_WIDTH: 32,
  PLAYER_HEIGHT: 32,
  PLAYER_SCALE: 1.4,
  PLAYER_COLOR: '#ff0066',

  // Colores
  PLATFORM_COLOR: '#6b3e00',
  OTHER_PLAYER_COLOR: '#00aaff'
};


const ASSETS = {
  PLAYER: '/assets/character_pink.png',
  BACKGROUND: '/assets/fondo.jpg'
};
// Add jump sound asset
ASSETS.JUMP = '/assets/salto.ogg';

const BACKGROUND_SETTINGS = {
  SCALE: 2.2,
  OVERLAY_ALPHA: 0.3,
  COLOR_STOPS: [
    { stop: 0, color: '#1a1a2e' },
    { stop: 0.4, color: '#3a1f5d' },
    { stop: 0.7, color: '#2b4c7e' },
    { stop: 1, color: '#f25f5c' }
  ]
};

// Plataformas (x, y, w, h)
// Generator that ensures each next platform is reachable given current physics.
const PLATFORMS = (() => {
  const platforms = [
    { x: 0, y: CONFIG.WORLD_HEIGHT - 60, w: CONFIG.WORLD_WIDTH, h: 60 }
  ];

  const STEP_COUNT = 22; // number of small platforms above the ground
  // Make vertical gaps larger to increase difficulty but keep under max jump (~110px)
  const VERTICAL_GAP = 96; // base px between platforms
  const MAX_HORZ_SHIFT = 110; // max horizontal shift per jump (based on speed*airtime ~110)
  // Narrower platforms for challenge
  const MIN_WIDTH = 140;
  const MAX_WIDTH = 220;

  // start near center
  let prevX = (CONFIG.WORLD_WIDTH - 260) / 2;
  let currentY = CONFIG.WORLD_HEIGHT - 60;

  for (let i = 0; i < STEP_COUNT; i++) {
    // Occasionally make a slightly larger vertical gap for variety
    const extraGap = (i % 5 === 0) ? 8 : 0;
    currentY -= (VERTICAL_GAP + extraGap);

    // alternate left-right shifts but limit them to MAX_HORZ_SHIFT
    const dir = i % 2 === 0 ? -1 : 1;
    // vary horizontal shift slightly per step to create tricky jumps
    const shift = Math.max(24, MAX_HORZ_SHIFT - (i % 4) * 8); // remain <= MAX_HORZ_SHIFT
    let newX = prevX + dir * shift;

    // vary widths, mostly narrow to increase precision required
    const width = Math.min(MAX_WIDTH, MIN_WIDTH + (i % 4) * 20);
    const safeMargin = 8;
    const minX = safeMargin;
    const maxX = CONFIG.WORLD_WIDTH - width - safeMargin;
    newX = Math.min(Math.max(newX, minX), maxX);

    // Occasionally make this platform a moving platform (but not the ground)
    const makeMoving = (i % 5 === 2); // roughly some platforms become moving
    if (makeMoving) {
      const range = 80 + (i % 3) * 30; // range of motion
      const minXMov = Math.max(minX, Math.round(newX - range));
      const maxXMov = Math.min(maxX, Math.round(newX + range));
      const vx = (i % 2 === 0) ? 0.6 : -0.6;
      platforms.push({ x: Math.round(newX), y: Math.round(currentY), w: width, h: 20, moving: true, minX: minXMov, maxX: maxXMov, vx });
    } else {
      platforms.push({ x: Math.round(newX), y: Math.round(currentY), w: width, h: 20 });
    }

    prevX = newX;
  }

  return platforms;
})();