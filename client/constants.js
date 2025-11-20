// client/constants.js

const CONFIG = {
  // Configuración de la física
  GRAVITY: 0.35,
  JUMP_POWER: -8,
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
  PLAYER_COLOR: '#ff0066',

  // Colores
  PLATFORM_COLOR: '#6b3e00',
  OTHER_PLAYER_COLOR: '#00aaff'
};


const ASSETS = {
  PLAYER: '/assets/character_pink.png'
   
};

// Plataformas (x, y, w, h)
const PLATFORMS = (() => {
  const platforms = [
    { x: 0, y: CONFIG.WORLD_HEIGHT - 60, w: CONFIG.WORLD_WIDTH, h: 60 }
  ];

  const STEP_COUNT = 28;
  const STEP_VERTICAL_GAP = 70;
  const STEP_WIDTH = 260;
  let currentX = (CONFIG.WORLD_WIDTH - STEP_WIDTH) / 2;

  for (let i = 0; i < STEP_COUNT; i++) {
    const direction = i % 2 === 0 ? -70 : 70;
    currentX += direction;
    const minX = 40;
    const maxX = CONFIG.WORLD_WIDTH - STEP_WIDTH - 40;
    currentX = Math.min(Math.max(currentX, minX), maxX);

    platforms.push({
      x: currentX,
      y: CONFIG.WORLD_HEIGHT - 60 - (i + 1) * STEP_VERTICAL_GAP,
      w: STEP_WIDTH,
      h: 20
    });
  }

  return platforms;
})();
