import io from 'socket.io-client';

AFRAME.registerComponent('multiplayer', {
  schema: {
    enabled: { default: false },
    gameMode: { default: '' },
    score: { default: 0 },
    combo: { default: 0 },
    serverUrl: { default: 'http://localhost:3001' } // Default local dev
  },

  init: function () {
    this.otherPlayers = {};
    this.tick = AFRAME.utils.throttleTick(this.tick, 50, this); // 20 updates/sec
    
    // Bind methods
    this.onConnect = this.onConnect.bind(this);
    this.onRoomJoined = this.onRoomJoined.bind(this);
    this.onNewPlayer = this.onNewPlayer.bind(this);
    this.onPlayerMoved = this.onPlayerMoved.bind(this);
    this.onPlayerScoreUpdated = this.onPlayerScoreUpdated.bind(this);
    this.onPlayerDisconnected = this.onPlayerDisconnected.bind(this);
    this.onError = this.onError.bind(this);
    
    this.createMenu();
  },

  createMenu: function() {
    // Create a simple menu for Room selection
    this.menuEl = document.createElement('a-entity');
    this.menuEl.setAttribute('visible', false);
    this.menuEl.setAttribute('position', '0 1.5 -1');
    
    // Background
    const bg = document.createElement('a-entity');
    bg.setAttribute('geometry', 'primitive: plane; width: 1.5; height: 1');
    bg.setAttribute('material', 'color: #222; opacity: 0.9');
    this.menuEl.appendChild(bg);

    // Title
    const title = document.createElement('a-entity');
    title.setAttribute('text', {
        value: 'MULTIPLAYER LOBBY',
        align: 'center',
        width: 3
    });
    title.setAttribute('position', '0 0.4 0.01');
    this.menuEl.appendChild(title);

    // Create Classic Button
    this.createButton('Create Classic Room', 0.15, () => {
        this.socket.emit('createRoom', { mode: 'classic' });
    });

    // Create Punch Button
    this.createButton('Create Punch Room', 0, () => {
        this.socket.emit('createRoom', { mode: 'punch' });
    });

    // Join Button (Simple random join for now or prompt)
    this.createButton('Join Room (Prompt)', -0.15, () => {
        // Since we can't easily do keyboard in VR without a virtual keyboard component,
        // we'll use a simple prompt for 2D testing, or auto-join a test room.
        // For now, let's just prompt in browser (works in 2D mode).
        const code = window.prompt("Enter Room Code:");
        if (code) {
            this.socket.emit('joinRoom', code);
        }
    });
    
    // Room Code Display
    this.roomCodeText = document.createElement('a-entity');
    this.roomCodeText.setAttribute('text', {
        value: '',
        align: 'center',
        width: 3,
        color: '#FFFF00'
    });
    this.roomCodeText.setAttribute('position', '0 -0.35 0.01');
    this.menuEl.appendChild(this.roomCodeText);

    this.el.sceneEl.appendChild(this.menuEl);
  },

  createButton: function(label, y, callback) {
    const btn = document.createElement('a-entity');
    btn.setAttribute('geometry', 'primitive: plane; width: 1.2; height: 0.12');
    btn.setAttribute('material', 'color: #444');
    btn.setAttribute('position', `0 ${y} 0.01`);
    btn.classList.add('raycastable'); // Make sure raycaster can hit it
    
    const text = document.createElement('a-entity');
    text.setAttribute('text', { value: label, align: 'center', width: 2 });
    text.setAttribute('position', '0 0 0.01');
    btn.appendChild(text);

    btn.addEventListener('mouseenter', () => btn.setAttribute('material', 'color', '#666'));
    btn.addEventListener('mouseleave', () => btn.setAttribute('material', 'color', '#444'));
    btn.addEventListener('click', callback);
    
    this.menuEl.appendChild(btn);
  },

  update: function (oldData) {
    const isMultiplayer = this.data.gameMode === 'multiplayer';
    const wasMultiplayer = oldData.gameMode === 'multiplayer';

    if (isMultiplayer && !wasMultiplayer) {
      this.connect();
      if (this.menuEl) this.menuEl.setAttribute('visible', true);
    } else if (!isMultiplayer && wasMultiplayer) {
      this.disconnect();
      if (this.menuEl) this.menuEl.setAttribute('visible', false);
    }
    
    // Fallback to manual enabled check if gameMode isn't used
    if (this.data.enabled && !oldData.enabled && !this.socket) {
      this.connect();
      if (this.menuEl) this.menuEl.setAttribute('visible', true);
    } else if (!this.data.enabled && oldData.enabled && !isMultiplayer) {
      this.disconnect();
      if (this.menuEl) this.menuEl.setAttribute('visible', false);
    }

    // Send score update if connected and score changed
    if (this.socket && isMultiplayer) {
        if (this.data.score !== oldData.score || this.data.combo !== oldData.combo) {
            this.socket.emit('scoreUpdate', {
                score: this.data.score,
                combo: this.data.combo
            });
        }
    }
  },

  connect: function () {
    if (this.socket) return;

    // Determine URL - if running on web, might need to adjust port or use relative
    let url = this.data.serverUrl;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // If hosted, assume server is on same host/port or proxied
        url = '/'; 
    }

    console.log('Connecting to multiplayer server...', url);
    this.socket = io(url);

    this.socket.on('connect', this.onConnect);
    this.socket.on('roomJoined', this.onRoomJoined);
    this.socket.on('newPlayer', this.onNewPlayer);
    this.socket.on('playerMoved', this.onPlayerMoved);
    this.socket.on('playerScoreUpdated', this.onPlayerScoreUpdated);
    this.socket.on('playerDisconnected', this.onPlayerDisconnected);
    this.socket.on('error', this.onError);
  },

  disconnect: function () {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // Remove all other players
    Object.keys(this.otherPlayers).forEach(id => {
      this.removePlayer(id);
    });
    if (this.roomCodeText) this.roomCodeText.setAttribute('text', 'value', '');
  },

  onConnect: function () {
    console.log('Connected to multiplayer server with ID:', this.socket.id);
  },

  onRoomJoined: function (data) {
    console.log('Joined room:', data);
    if (this.roomCodeText) {
        this.roomCodeText.setAttribute('text', 'value', `Room: ${data.code} (${data.mode})`);
    }
    // Hide menu after joining? Or keep it to show room code?
    // For now, keep it but maybe move it or make it smaller.
    // Actually, let's hide the buttons but keep the code.
    // Simplified: Just update the text.
    
    // Clear existing players
    Object.keys(this.otherPlayers).forEach(id => this.removePlayer(id));
    
    // Add current players
    Object.keys(data.players).forEach(id => {
      if (id === this.socket.id) return;
      this.addPlayer(data.players[id]);
    });
  },

  onError: function(data) {
      console.error('Multiplayer Error:', data);
      alert(data.message); // Simple alert for now
  },

  onCurrentPlayers: function (players) {
      // Deprecated in favor of roomJoined
  },

  onNewPlayer: function (player) {
    this.addPlayer(player);
  },

  onPlayerMoved: function (data) {
    const playerEl = this.otherPlayers[data.id];
    if (playerEl) {
      // Interpolation could be added here for smoothness
      playerEl.object3D.position.copy(data.position);
      playerEl.object3D.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
      
      if (data.hands) {
        const leftHand = playerEl.querySelector('.left-hand');
        const rightHand = playerEl.querySelector('.right-hand');
        
        if (leftHand && data.hands.left) {
            leftHand.object3D.position.copy(data.hands.left.position);
            leftHand.object3D.rotation.set(data.hands.left.rotation.x, data.hands.left.rotation.y, data.hands.left.rotation.z);
        }
        if (rightHand && data.hands.right) {
            rightHand.object3D.position.copy(data.hands.right.position);
            rightHand.object3D.rotation.set(data.hands.right.rotation.x, data.hands.right.rotation.y, data.hands.right.rotation.z);
        }
      }
    }
  },

  onPlayerScoreUpdated: function (data) {
    const playerEl = this.otherPlayers[data.id];
    if (playerEl) {
        // Update score display above player head
        const scoreText = playerEl.querySelector('.score-text');
        if (scoreText) {
            scoreText.setAttribute('text', 'value', `Score: ${data.score}\nCombo: ${data.combo}`);
        }
    }
  },

  onPlayerDisconnected: function (id) {
    this.removePlayer(id);
  },

  addPlayer: function (playerData) {
    if (this.otherPlayers[playerData.id]) return;

    const playerEl = document.createElement('a-entity');
    playerEl.setAttribute('id', 'player-' + playerData.id);
    
    // Head
    const head = document.createElement('a-entity');
    head.setAttribute('geometry', 'primitive: box; width: 0.25; height: 0.25; depth: 0.25');
    head.setAttribute('material', 'color: #FF0000'); // Red for other players
    playerEl.appendChild(head);

    // Score Text
    const scoreText = document.createElement('a-entity');
    scoreText.classList.add('score-text');
    scoreText.setAttribute('text', {
        value: 'Score: 0\nCombo: 0',
        align: 'center',
        color: '#FFF',
        width: 2
    });
    scoreText.setAttribute('position', '0 0.5 0');
    scoreText.setAttribute('rotation', '0 180 0'); // Face the local player (approx)
    playerEl.appendChild(scoreText);

    // Hands
    const leftHand = document.createElement('a-entity');
    leftHand.classList.add('left-hand');
    leftHand.setAttribute('geometry', 'primitive: box; width: 0.1; height: 0.1; depth: 0.1');
    leftHand.setAttribute('material', 'color: #0000FF');
    playerEl.appendChild(leftHand);

    const rightHand = document.createElement('a-entity');
    rightHand.classList.add('right-hand');
    rightHand.setAttribute('geometry', 'primitive: box; width: 0.1; height: 0.1; depth: 0.1');
    rightHand.setAttribute('material', 'color: #0000FF');
    playerEl.appendChild(rightHand);

    this.el.sceneEl.appendChild(playerEl);
    this.otherPlayers[playerData.id] = playerEl;
  },

  removePlayer: function (id) {
    const playerEl = this.otherPlayers[id];
    if (playerEl) {
      playerEl.parentNode.removeChild(playerEl);
      delete this.otherPlayers[id];
    }
  },

  tick: function () {
    if (!this.socket || !this.data.enabled) return;

    const camera = this.el.sceneEl.camera;
    if (!camera) return;

    const position = camera.el.object3D.position;
    const rotation = camera.el.object3D.rotation;

    // Get hands
    // This assumes standard rig structure. Adjust selectors if needed.
    const leftHandEl = document.getElementById('leftHand');
    const rightHandEl = document.getElementById('rightHand');

    const hands = {};
    if (leftHandEl) {
        hands.left = {
            position: leftHandEl.object3D.position,
            rotation: { x: leftHandEl.object3D.rotation.x, y: leftHandEl.object3D.rotation.y, z: leftHandEl.object3D.rotation.z }
        };
    }
    if (rightHandEl) {
        hands.right = {
            position: rightHandEl.object3D.position,
            rotation: { x: rightHandEl.object3D.rotation.x, y: rightHandEl.object3D.rotation.y, z: rightHandEl.object3D.rotation.z }
        };
    }

    this.socket.emit('playerMovement', {
      position: position,
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      hands: hands
    });
  }
});
