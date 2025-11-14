// Client-side game: basic platformer movement + sync via Socket.io
const socket = io();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// local player
const player = { x: 100, y: 100, w: 28, h: 36, vx:0, vy:0, speed: 2.2, color: '#ff0066', onGround: false };
const gravity = 0.35;
const jumpPower = -8;

const otherPlayers = {};

// simple platforms (x,y,w,h)
const platforms = [
  {x:0,y:480,w:960,h:60},
  {x:200,y:380,w:160,h:20},
  {x:420,y:320,w:120,h:20},
  {x:640,y:420,w:200,h:20}
];

// Socket events
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

// Basic AABB collision for platforms
function resolvePlatformCollisions(p) {
  p.onGround = false;
  for (const plat of platforms) {
    if (p.x < plat.x + plat.w &&
        p.x + p.w > plat.x &&
        p.y < plat.y + plat.h &&
        p.y + p.h > plat.y) {
      // simple resolve: put on top of platform if falling
      if (p.vy > 0 && p.y + p.h - p.vy <= plat.y + 2) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0 && p.y >= plat.y + plat.h - 2) {
        // head hit
        p.y = plat.y + plat.h;
        p.vy = 0;
      } else {
        // horizontal collision - push out
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

function update() {
  // input
  if (keys['a'] || keys['ArrowLeft']) player.vx = -player.speed;
  else if (keys['d'] || keys['ArrowRight']) player.vx = player.speed;
  else player.vx = 0;

  if ((keys['w'] || keys['ArrowUp'] || keys[' ']) && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
  }

  // physics
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // world bounds
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
  if (player.y > canvas.height) { player.y = 100; player.vy = 0; }

  resolvePlatformCollisions(player);

  // send position to server
  socket.emit('playerMovement', {
    x: Math.round(player.x),
    y: Math.round(player.y),
    vx: player.vx,
    vy: player.vy
  });
}

function draw() {
  // background
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw platforms
  ctx.fillStyle = '#6b3e00';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  }

  // draw other players
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    ctx.fillStyle = p.color || '#00aaff';
    ctx.fillRect(p.x, p.y, player.w, player.h);
    ctx.fillStyle = '#000';
    ctx.font = '10px monospace';
    ctx.fillText(p.name || id.slice(0,4), p.x, p.y - 6);
  }

  // draw local player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#000';
  ctx.font = '12px monospace';
  ctx.fillText('You', player.x, player.y - 8);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

