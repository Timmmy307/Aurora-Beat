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

const rooms = {}; // { roomCode: { mode: 'classic', players: [], host: socketId, song: null, readyPlayers: [] } }
const players = {}; // { socketId: { room: 'ABCD', ... } }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Helper to check if modes are compatible
// Touch mode is for web/browser users, classic/punch are for VR users
function areModesCompatible(roomMode, playerMode) {
  const webModes = ['touch'];
  const vrModes = ['classic', 'punch'];
  
  // If no player mode specified, allow (legacy support)
  if (!playerMode) return true;
  
  // Check if both are web modes or both are VR modes
  const roomIsWeb = webModes.includes(roomMode);
  const playerIsWeb = webModes.includes(playerMode);
  
  return roomIsWeb === playerIsWeb;
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('createRoom', (data) => {
    const roomCode = generateRoomCode();
    const mode = data.mode || 'classic';
    
    rooms[roomCode] = {
      mode: mode,
      players: [],
      host: socket.id,
      song: null,
      readyPlayers: []
    };
    
    joinRoom(socket, roomCode, mode);
  });

  socket.on('joinRoom', (data) => {
    // Support both old format (just roomCode string) and new format (object with roomCode and playerMode)
    let roomCode, playerMode;
    if (typeof data === 'string') {
      roomCode = data.toUpperCase();
      playerMode = null;
    } else {
      roomCode = (data.roomCode || '').toUpperCase();
      playerMode = data.playerMode;
    }
    
    if (!rooms[roomCode]) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const room = rooms[roomCode];
    
    // Check mode compatibility
    if (!areModesCompatible(room.mode, playerMode)) {
      const roomType = ['touch'].includes(room.mode) ? 'browser/touch' : 'VR';
      const playerType = ['touch'].includes(playerMode) ? 'browser/touch' : 'VR';
      socket.emit('error', { 
        message: `Cannot join: This is a ${roomType} room. You are using ${playerType} mode.`
      });
      return;
    }
    
    joinRoom(socket, roomCode, playerMode);
  });

  function joinRoom(socket, roomCode, playerMode) {
    const room = rooms[roomCode];
    
    // Initialize player
    players[socket.id] = {
      id: socket.id,
      room: roomCode,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      score: 0,
      combo: 0,
      ready: false
    };

    socket.join(roomCode);
    room.players.push(socket.id);

    // Send room info to player (including whether they're the host)
    socket.emit('roomJoined', { 
      code: roomCode, 
      mode: room.mode,
      players: getRoomPlayers(roomCode),
      isHost: room.host === socket.id,
      song: room.song
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
  
  // Host selects a song
  socket.on('selectSong', (songData) => {
    const player = players[socket.id];
    if (!player || !player.room) return;
    
    const room = rooms[player.room];
    if (!room) return;
    
    // Only host can select song
    if (room.host !== socket.id) {
      socket.emit('error', { message: 'Only the host can select a song' });
      return;
    }
    
    room.song = songData;
    room.readyPlayers = []; // Reset ready status when song changes
    
    // Broadcast song selection to all players in room
    io.to(player.room).emit('songSelected', songData);
    console.log(`Song selected in room ${player.room}:`, songData);
  });
  
  // Player marks ready
  socket.on('playerReady', () => {
    const player = players[socket.id];
    if (!player || !player.room) return;
    
    const room = rooms[player.room];
    if (!room) return;
    
    // Can't ready without a song
    if (!room.song) {
      socket.emit('error', { message: 'Wait for host to select a song first' });
      return;
    }
    
    player.ready = true;
    if (!room.readyPlayers.includes(socket.id)) {
      room.readyPlayers.push(socket.id);
    }
    
    // Broadcast ready status
    io.to(player.room).emit('playerReady', {
      playerId: socket.id,
      readyCount: room.readyPlayers.length,
      totalPlayers: room.players.length
    });
    
    // Check if all players are ready
    if (room.readyPlayers.length === room.players.length && room.players.length >= 1) {
      startCountdown(player.room);
    }
  });
  
  function startCountdown(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    let count = 3;
    const countdownInterval = setInterval(() => {
      io.to(roomCode).emit('countdown', { count });
      count--;
      
      if (count < 0) {
        clearInterval(countdownInterval);
        // Start the song!
        io.to(roomCode).emit('startSong', room.song);
        
        // Reset ready state for next round
        room.readyPlayers = [];
        room.players.forEach(id => {
          if (players[id]) players[id].ready = false;
        });
      }
    }, 1000);
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
