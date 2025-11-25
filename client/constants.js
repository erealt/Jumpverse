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
  BACKGROUND: '/assets/suelo.jpg'
};

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
  const VERTICAL_GAP = 68; // px between platforms (should be <= max jump height ~110)
  const MAX_HORZ_SHIFT = 90; // max horizontal shift per jump (based on speed*airtime ~110)
  const MIN_WIDTH = 220;
  const MAX_WIDTH = 280;

  // start near center
  let prevX = (CONFIG.WORLD_WIDTH - 260) / 2;
  let currentY = CONFIG.WORLD_HEIGHT - 60;

  for (let i = 0; i < STEP_COUNT; i++) {
    currentY -= VERTICAL_GAP;

    // alternate left-right shifts but limit them to MAX_HORZ_SHIFT
    const dir = i % 2 === 0 ? -1 : 1;
    const shift = MAX_HORZ_SHIFT - (i % 3) * 10; // vary shift slightly
    let newX = prevX + dir * shift;

    const width = MIN_WIDTH + (i % 3) * 20; // 220, 240, 260 etc
    const safeMargin = 12;
    const minX = safeMargin;
    const maxX = CONFIG.WORLD_WIDTH - width - safeMargin;
    newX = Math.min(Math.max(newX, minX), maxX);

    platforms.push({ x: Math.round(newX), y: Math.round(currentY), w: width, h: 20 });

    prevX = newX;
  }

  return platforms;
})();

