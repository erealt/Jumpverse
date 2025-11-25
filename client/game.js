

// Inicialización de Socket.io
const socket = io();

// Inicialización de Canvas
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const camera = {
  x: 0,
  y: Math.max(0, CONFIG.WORLD_HEIGHT - canvas.height)
};

// Manejo de entrada
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Variables de juego
const otherPlayers = {};
// Jugador local, usando las constantes de CONFIG
const player = {
  x: canvas.width / 2 - CONFIG.PLAYER_WIDTH / 2,
  y: CONFIG.WORLD_HEIGHT - CONFIG.PLAYER_HEIGHT - 60,
  w: CONFIG.PLAYER_WIDTH,
  h: CONFIG.PLAYER_HEIGHT,
  vx: 0, vy: 0,
  speed: CONFIG.PLAYER_SPEED,
  color: CONFIG.PLAYER_COLOR,
  onGround: false,
  prevX: canvas.width / 2 - CONFIG.PLAYER_WIDTH / 2,
  prevY: CONFIG.WORLD_HEIGHT - CONFIG.PLAYER_HEIGHT - 60
};

// Lógica de carga de assets
let playerSprite = new Image();
let backgroundImage = null;
let backgroundPattern = null;
let backgroundCanvas = null;
let backgroundCtx = null;
let assetsLoaded = false;

function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let value = hex.replace('#', '').trim();
  if (value.length === 3) {
    value = value.split('').map((char) => char + char).join('');
  }
  const int = parseInt(value, 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function lerp(a, b, t) {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function lerpColor(colorA, colorB, t) {
  return {
    r: lerp(colorA.r, colorB.r, t),
    g: lerp(colorA.g, colorB.g, t),
    b: lerp(colorA.b, colorB.b, t)
  };
}

function getColorFromStops(stops = [], t) {
  if (!stops.length) return 'rgba(0, 0, 0, 0)';
  const clamped = Math.min(Math.max(t, 0), 1);
  let previous = stops[0];
  for (const stop of stops) {
    if (clamped <= stop.stop) {
      const span = stop.stop - previous.stop || 1;
      const localT = (clamped - previous.stop) / span;
      const color = lerpColor(hexToRgb(previous.color), hexToRgb(stop.color), localT);
      return rgbToCss(color);
    }
    previous = stop;
  }
  const lastColor = hexToRgb(stops[stops.length - 1].color);
  return rgbToCss(lastColor);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadAssets() {
  // Load background always, player sprite only when ASSETS.PLAYER is set
  const bgPromise = loadImage(ASSETS.BACKGROUND);
  const playerPromise = ASSETS.PLAYER ? loadImage(ASSETS.PLAYER) : Promise.resolve(null);

  const [playerImg, bgImg] = await Promise.all([playerPromise, bgPromise]);

  if (playerImg) {
    playerSprite = playerImg;
    assetsLoaded = true;
  } else {
    // keep assetsLoaded as-is (false if no sprite chosen)
    assetsLoaded = assetsLoaded && !!playerSprite;
  }

  if (bgImg) {
    const scale = BACKGROUND_SETTINGS?.SCALE || 1;
    const scaledWidth = Math.max(1, Math.floor(bgImg.width * scale));
    const scaledHeight = Math.max(1, Math.floor(bgImg.height * scale));

    backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = scaledWidth;
    backgroundCanvas.height = scaledHeight;
    backgroundCtx = backgroundCanvas.getContext('2d');
    backgroundCtx.drawImage(bgImg, 0, 0, scaledWidth, scaledHeight);

    backgroundImage = bgImg;
    backgroundPattern = ctx.createPattern(backgroundCanvas, 'repeat');
  } else {
    backgroundImage = null;
    backgroundPattern = null;
    backgroundCanvas = null;
    backgroundCtx = null;
  }
}

// --- Funciones del Juego ---
function resolveCollisions(p) {
  p.onGround = false;
  // previous bounds
  const prev = { x: p.prevX, y: p.prevY, w: p.w, h: p.h };

  for (const plat of PLATFORMS) {
    const collided = p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y < plat.y + plat.h && p.y + p.h > plat.y;
    if (!collided) continue;

    const prevBottom = prev.y + prev.h;
    const prevTop = prev.y;
    const prevRight = prev.x + prev.w;
    const prevLeft = prev.x;

    const platTop = plat.y;
    const platBottom = plat.y + plat.h;

    // Land on platform: previous bottom was above platform top
    if (prevBottom <= platTop) {
      p.y = platTop - p.h;
      p.vy = 0;
      p.onGround = true;
      continue;
    }

    // Hit head on platform: previous top was below platform bottom
    if (prevTop >= platBottom) {
      p.y = platBottom;
      p.vy = 0;
      continue;
    }

    // Horizontal collision: determine side based on previous horizontal position
    if (prevRight <= plat.x) {
      // collided into platform from left
      p.x = plat.x - p.w - 0.1;
      p.vx = 0;
      continue;
    }
    if (prevLeft >= plat.x + plat.w) {
      // collided into platform from right
      p.x = plat.x + plat.w + 0.1;
      p.vx = 0;
      continue;
    }

    // Fallback: push the player up if still overlapping
    if (p.vy >= 0) {
      p.y = platTop - p.h;
      p.vy = 0;
      p.onGround = true;
    } else {
      p.y = platBottom;
      p.vy = 0;
    }
  }
}

function handleInput() {
  player.vx = 0; 
  if (keys['a'] || keys['ArrowLeft']) player.vx = -player.speed;
  else if (keys['d'] || keys['ArrowRight']) player.vx = player.speed;

  // Usa 'w', 'ArrowUp' o 'espacio' para saltar
  if ((keys['w'] || keys['ArrowUp'] || keys[' ']) && player.onGround) {
    player.vy = CONFIG.JUMP_POWER; // Usa constante
    player.onGround = false;
  }
}

function updatePhysics() {
  // Aplicar física
  // store previous position for robust collision resolution
  player.prevX = player.x;
  player.prevY = player.y;
  player.vy += CONFIG.GRAVITY; // Usa constante
  player.x += player.vx;
  player.y += player.vy;

  // Límites del mundo
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > CONFIG.WORLD_WIDTH) player.x = CONFIG.WORLD_WIDTH - player.w;
  if (player.y < 0) { player.y = 0; player.vy = 0; }
  if (player.y + player.h > CONFIG.WORLD_HEIGHT) {
    player.y = CONFIG.WORLD_HEIGHT - CONFIG.PLAYER_HEIGHT - 60;
    player.vy = 0;
    player.onGround = true;
  }

  resolveCollisions(player);
  updateCamera();

  // Enviar posición al servidor
  socket.emit('playerMovement', {
    x: Math.round(player.x),
    y: Math.round(player.y),
    vx: player.vx,
    vy: player.vy
  });
}

function updateCamera() {
  const targetX = player.x + player.w / 2 - canvas.width / 2;
  const maxOffsetX = Math.max(0, CONFIG.WORLD_WIDTH - canvas.width);
  camera.x = Math.min(Math.max(targetX, 0), maxOffsetX);

  const targetY = player.y + player.h / 2 - canvas.height / 2;
  const maxOffsetY = Math.max(0, CONFIG.WORLD_HEIGHT - canvas.height);
  camera.y = Math.min(Math.max(targetY, 0), maxOffsetY);
}

function drawBackground() {
  const maxOffsetY = Math.max(0, CONFIG.WORLD_HEIGHT - canvas.height);
  const progress = maxOffsetY === 0 ? 0 : camera.y / maxOffsetY;
  const easedProgress = Math.pow(progress, 1.5);
  const overlayColor = getColorFromStops(BACKGROUND_SETTINGS?.COLOR_STOPS, progress);
  const overlayAlpha = BACKGROUND_SETTINGS?.OVERLAY_ALPHA ?? 0.35;

  if (backgroundPattern && backgroundCanvas) {
    ctx.save();
    const tileWidth = backgroundCanvas.width;
    const tileHeight = backgroundCanvas.height;
    const offsetX = -(camera.x % tileWidth);
    const offsetY = -(camera.y % tileHeight);
    ctx.translate(offsetX, offsetY);
    ctx.fillStyle = backgroundPattern;
    ctx.fillRect(
      -tileWidth,
      -tileHeight,
      canvas.width + tileWidth * 2,
      canvas.height + tileHeight * 2
    );
    ctx.restore();

    if (overlayAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = overlayAlpha;
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  const topColor = getColorFromStops(BACKGROUND_SETTINGS?.COLOR_STOPS, Math.max(easedProgress - 0.15, 0));
  const bottomColor = getColorFromStops(BACKGROUND_SETTINGS?.COLOR_STOPS, Math.min(easedProgress + 0.15, 1));
  gradient.addColorStop(0, topColor || CONFIG.BACKGROUND.SKY_TOP);
  gradient.addColorStop(1, bottomColor || CONFIG.BACKGROUND.SKY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Dibujar plataformas
  ctx.fillStyle = CONFIG.PLATFORM_COLOR;
  for (const plat of PLATFORMS) {
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  }

  // Dibujar otros jugadores
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    ctx.fillStyle = p.color || CONFIG.OTHER_PLAYER_COLOR;

    if (assetsLoaded) {
      ctx.drawImage(playerSprite, p.x, p.y, player.w, player.h);
    } else {
      ctx.fillRect(p.x, p.y, player.w, player.h);
    }

    ctx.fillStyle = '#000';
    ctx.font = '10px monospace';
    ctx.fillText(p.name || id.slice(0, 4), p.x, p.y - 6);
  }

  if (assetsLoaded) {
    ctx.drawImage(playerSprite, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  ctx.fillStyle = '#000';
  ctx.font = '12px monospace';
  ctx.fillText('You', player.x, player.y - 8);

  ctx.restore();
}

// --- Bucle principal del juego ---
function loop() {
  handleInput();
  updatePhysics();
  draw();
  requestAnimationFrame(loop);
}


// --- Manejo de Eventos de Socket.io (Se mantiene igual) ---

socket.on('connect', () => {
  console.log('connected', socket.id);
});

socket.on('currentPlayers', (players) => {
  for (const id in players) {
    if (id === socket.id) {
      player.x = players[id].x;
      player.y = players[id].y;
      player.color = players[id].color || player.color;
    } else {
      otherPlayers[id] = players[id];
    }
  }
});

socket.on('newPlayer', (p) => {
  otherPlayers[p.id] = p;
});

socket.on('playerMoved', (p) => {
  if (p.id !== socket.id) otherPlayers[p.id] = p;
});

socket.on('playerDisconnected', (id) => {
  delete otherPlayers[id];
});

// 🚀 Iniciar la carga y luego el loop
async function start() {
    await loadAssets();
    loop();
}

// Wait for user to select character in the menu before starting
function applySelectionAndStart(selection) {
  if (!selection) selection = { type: 'color', color: CONFIG.PLAYER_COLOR };

  // Apply size scale to the player before starting
  const scale = CONFIG.PLAYER_SCALE || 1;
  player.w = Math.round(CONFIG.PLAYER_WIDTH * scale);
  player.h = Math.round(CONFIG.PLAYER_HEIGHT * scale);

  if (selection.type === 'sprite') {
    // set ASSETS.PLAYER so loadAssets will load the chosen sprite
    ASSETS.PLAYER = selection.src;
    // start game loop — loadAssets will pick up ASSETS.PLAYER
    start();
  } else if (selection.type === 'color') {
    // use solid color sprite
    ASSETS.PLAYER = null; // ensure no sprite is loaded
    assetsLoaded = false;
    player.color = selection.color || CONFIG.PLAYER_COLOR;
    start();
  }
}

// Hook menu UI
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('menuOverlay');
  const choices = Array.from(document.querySelectorAll('.choice'));
  let current = choices[0];
  current.classList.add('selected');

  choices.forEach(ch => ch.addEventListener('click', () => {
    if (current) current.classList.remove('selected');
    current = ch;
    ch.classList.add('selected');
  }));

  document.getElementById('playBtn').addEventListener('click', () => {
    const type = current.getAttribute('data-type');
    if (type === 'sprite') {
      const src = current.getAttribute('data-src');
      overlay.style.display = 'none';
      applySelectionAndStart({ type: 'sprite', src });
    } else {
      const color = current.getAttribute('data-color');
      overlay.style.display = 'none';
      applySelectionAndStart({ type: 'color', color });
    }
  });
});