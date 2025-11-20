

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
  onGround: false
};

// Lógica de carga de assets
let playerSprite = new Image(); 

let assetsLoaded = false;

function loadAssets() {
  return new Promise((resolve) => {
    playerSprite.onload = () => {
      console.log('Player sprite loaded!');
      assetsLoaded = true;
      resolve();
    };
    // ASSETS.PLAYER se define en el archivo constants.js
    playerSprite.src = ASSETS.PLAYER; 
    
    // Manejo básico de error de carga
    playerSprite.onerror = () => {
        console.error('Failed to load player sprite from:', ASSETS.PLAYER);
        assetsLoaded = false; // Permite que el juego inicie con el color de respaldo
        resolve(); 
    };
  });
}

// --- Funciones del Juego ---
function resolveCollisions(p) {
  p.onGround = false;
  for (const plat of PLATFORMS) { // PLATFORMS viene de constants.js
    if (p.x < plat.x + plat.w &&
        p.x + p.w > plat.x &&
        p.y < plat.y + plat.h &&
        p.y + p.h > plat.y) {
      
      // Colisión por arriba (aterrizaje)
      if (p.vy > 0 && p.y + p.h - p.vy <= plat.y + 2) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } 
      // Colisión por abajo (cabeza)
      else if (p.vy < 0 && p.y >= plat.y + plat.h - 2) {
        p.y = plat.y + plat.h;
        p.vy = 0;
      } 
      // Colisión horizontal
      else {
        if (p.x + p.w/2 < plat.x + plat.w/2) {
          p.x = plat.x - p.w - 0.1;
        } else {
          p.x = plat.x + plat.w + 0.1;
        }
        p.vx = 0;
      }
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
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, CONFIG.BACKGROUND.SKY_TOP);
  gradient.addColorStop(1, CONFIG.BACKGROUND.SKY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const layerHeight = 200;
  const parallaxOffsetY = (camera.y * 0.2) % layerHeight;
  ctx.fillStyle = CONFIG.BACKGROUND.PARALLAX_COLOR;
  ctx.globalAlpha = 0.25;
  for (let y = -layerHeight; y <= canvas.height + layerHeight; y += layerHeight) {
    const stripeY = y - parallaxOffsetY;
    ctx.fillRect(0, stripeY, canvas.width, 80);
  }
  ctx.globalAlpha = 1;
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

start();