const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

const rooms = {}; // { roomCode: { mode: 'classic', players: [] } }
const players = {}; // { socketId: { room: 'ABCD', ... } }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('createRoom', (data) => {
    const roomCode = generateRoomCode();
    const mode = data.mode || 'classic';
    
    rooms[roomCode] = {
      mode: mode,
      players: []
    };
    
    joinRoom(socket, roomCode);
  });

  socket.on('joinRoom', (roomCode) => {
    roomCode = roomCode.toUpperCase();
    if (rooms[roomCode]) {
      joinRoom(socket, roomCode);
    } else {
      socket.emit('error', { message: 'Room not found' });
    }
  });

  function joinRoom(socket, roomCode) {
    const room = rooms[roomCode];
    
    // Initialize player
    players[socket.id] = {
      id: socket.id,
      room: roomCode,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      score: 0,
      combo: 0
    };

    socket.join(roomCode);
    room.players.push(socket.id);

    // Send room info to player
    socket.emit('roomJoined', { 
      code: roomCode, 
      mode: room.mode,
      players: getRoomPlayers(roomCode)
    });

    // Broadcast new player to others in room
    socket.to(roomCode).emit('newPlayer', players[socket.id]);
  }

  function getRoomPlayers(roomCode) {
    const roomPlayers = {};
    if (rooms[roomCode]) {
      rooms[roomCode].players.forEach(id => {
        if (players[id]) {
          roomPlayers[id] = players[id];
        }
      });
    }
    return roomPlayers;
  }

  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id];
    if (player && player.room) {
      player.position = movementData.position;
      player.rotation = movementData.rotation;
      player.hands = movementData.hands;
      
      socket.to(player.room).emit('playerMoved', {
        id: socket.id,
        ...movementData
      });
    }
  });

  socket.on('scoreUpdate', (scoreData) => {
    const player = players[socket.id];
    if (player && player.room) {
      player.score = scoreData.score;
      player.combo = scoreData.combo;
      
      socket.to(player.room).emit('playerScoreUpdated', {
        id: socket.id,
        score: scoreData.score,
        combo: scoreData.combo
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const player = players[socket.id];
    if (player && player.room) {
      const roomCode = player.room;
      if (rooms[roomCode]) {
        rooms[roomCode].players = rooms[roomCode].players.filter(id => id !== socket.id);
        socket.to(roomCode).emit('playerDisconnected', socket.id);
        
        // Clean up empty room
        if (rooms[roomCode].players.length === 0) {
          delete rooms[roomCode];
        }
      }
    }
    delete players[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
