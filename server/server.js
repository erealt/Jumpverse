const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/../public'));

const PORT = process.env.PORT || 3000;

// Simple in-memory player store
const players = {};

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);
  // create a player with default position
  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * 200) + 50,
    y: 100,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    name: 'Player_' + socket.id.slice(0,4)
  };

  // send existing players to the new client
  socket.emit('currentPlayers', players);
  // notify others about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // when a player moves
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].vx = data.vx;
      players[socket.id].vy = data.vy;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

http.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
