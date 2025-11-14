

// Inicialización de Socket.io
const socket = io();

// Inicialización de Canvas
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Manejo de entrada
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Variables de juego
const otherPlayers = {};
// Jugador local, usando las constantes de CONFIG
const player = { 
    x: 100, y: 100, 
    w: CONFIG.PLAYER_WIDTH, 
    h: CONFIG.PLAYER_HEIGHT, 
    vx: 0, vy: 0, 
    speed: CONFIG.PLAYER_SPEED, 
    color: CONFIG.PLAYER_COLOR, 
    onGround: false 
};

// 🖼️ NUEVO: Lógica de carga de assets
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

// --- Funciones del Juego (Actualización) ---

// Basado en el código original: Basic AABB collision for platforms
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
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
  if (player.y > canvas.height) { player.y = 100; player.vy = 0; }

  resolveCollisions(player);

  // Enviar posición al servidor
  socket.emit('playerMovement', {
    x: Math.round(player.x),
    y: Math.round(player.y),
    vx: player.vx,
    vy: player.vy
  });
}

function draw() {
  // Fondo
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar plataformas
  ctx.fillStyle = CONFIG.PLATFORM_COLOR; // Usa constante
  for (const plat of PLATFORMS) {
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  }

  // Dibujar otros jugadores
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    ctx.fillStyle = p.color || CONFIG.OTHER_PLAYER_COLOR; // Usa constante
    
    // 🖼️ DIBUJO DE OTROS JUGADORES (con respaldo al sprite)
    if (assetsLoaded) {
        ctx.drawImage(playerSprite, p.x, p.y, player.w, player.h); 
    } else {
        ctx.fillRect(p.x, p.y, player.w, player.h);
    }
    
    // Dibujar nombre
    ctx.fillStyle = '#000';
    ctx.font = '10px monospace';
    ctx.fillText(p.name || id.slice(0, 4), p.x, p.y - 6);
  }

  // 🖼️ DIBUJAR JUGADOR LOCAL
  if (assetsLoaded) {
    ctx.drawImage(playerSprite, player.x, player.y, player.w, player.h);
  } else {
    // Dibujo de respaldo si el sprite aún no carga
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // Dibujar "You"
  ctx.fillStyle = '#000';
  ctx.font = '12px monospace';
  ctx.fillText('You', player.x, player.y - 8);
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