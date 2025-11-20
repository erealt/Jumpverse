const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const WORLD = {
  WIDTH: 960,
  HEIGHT: 2400
};

// CORRECCIÓN: Sirve archivos estáticos desde la carpeta 'client'
app.use(express.static(__dirname + '/../client'));

const PORT = process.env.PORT || 3000;

// Almacén simple de jugadores en memoria
const players = {};

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // 1. Inicializar el jugador
  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * (WORLD.WIDTH - 200)) + 100,
    y: WORLD.HEIGHT - 60 - 32,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    name: 'Player_' + socket.id.slice(0,4)
  };

  // 2. Enviar estado inicial y notificar a los demás
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // 3. Manejar movimiento de jugador
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      // Sincronizar posición y velocidad del jugador local
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].vx = data.vx;
      players[socket.id].vy = data.vy;
      // Emitir el movimiento a todos excepto al jugador actual
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // 4. Manejar desconexión
  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

http.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});