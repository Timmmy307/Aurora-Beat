import io from 'socket.io-client';

AFRAME.registerComponent('multiplayer', {
  schema: {
    enabled: { default: false },
    gameMode: { default: '' },
    hasVR: { default: false },
    score: { default: 0 },
    combo: { default: 0 },
    serverUrl: { default: 'http://localhost:3000' } // Default local dev
  },

  init: function () {
    try {
      this.otherPlayers = {};
      this.tick = AFRAME.utils.throttleTick(this.tick, 50, this); // 20 updates/sec
      this.isHost = false;
      this.playersReady = {};
      this.allReady = false;
      this.currentRoomCode = null;
      
      // Bind methods (stored as instance properties for proper cleanup)
      this.onConnect = this.onConnect.bind(this);
      this.onRoomJoined = this.onRoomJoined.bind(this);
      this.onNewPlayer = this.onNewPlayer.bind(this);
      this.onPlayerMoved = this.onPlayerMoved.bind(this);
      this.onPlayerScoreUpdated = this.onPlayerScoreUpdated.bind(this);
      this.onPlayerDisconnected = this.onPlayerDisconnected.bind(this);
      this.onError = this.onError.bind(this);
      this.onSongSelected = this.onSongSelected.bind(this);
      this.onPlayerReady = this.onPlayerReady.bind(this);
      this.onCountdown = this.onCountdown.bind(this);
      this.onStartSong = this.onStartSong.bind(this);
      this.onKeyboardInput = this.onKeyboardInput.bind(this);
      this.onHostSongSelect = this.onHostSongSelect.bind(this);
      
      // Set up event listeners for menu buttons (from template)
      this.setupMenuEventListeners();
      
      // Create the join keyboard (hidden by default)
      this.createJoinKeyboard();
    } catch (e) {
      console.error('Multiplayer init failed:', e);
    }
  },
  
  setupMenuEventListeners: function() {
    const sceneEl = this.el.sceneEl;
    
    // Create Touch Room
    sceneEl.addEventListener('mpcreatetouchroom', () => {
      console.log('Creating touch room');
      if (!this.socket) this.connect();
      if (this.socket) {
        this.isHost = true;
        this.socket.emit('createRoom', { mode: 'touch', avatar: this.getLocalAvatar() });
      }
    });
    
    // Create Classic Room
    sceneEl.addEventListener('mpcreateclassicroom', () => {
      console.log('Creating classic room');
      if (!this.socket) this.connect();
      if (this.socket) {
        this.isHost = true;
        this.socket.emit('createRoom', { mode: 'classic', avatar: this.getLocalAvatar() });
      }
    });
    
    // Create Punch Room
    sceneEl.addEventListener('mpcreatepunchroom', () => {
      console.log('Creating punch room');
      if (!this.socket) this.connect();
      if (this.socket) {
        this.isHost = true;
        this.socket.emit('createRoom', { mode: 'punch', avatar: this.getLocalAvatar() });
      }
    });
    
    // Join Room
    sceneEl.addEventListener('mpjoinroom', () => {
      console.log('Showing join keyboard');
      this.showJoinKeyboard();
    });
    
    // Customize Avatar
    sceneEl.addEventListener('mpcustomizeavatar', () => {
      console.log('Showing avatar customizer');
      this.showAvatarCustomizer();
    });
    
    // Back
    sceneEl.addEventListener('mpback', () => {
      console.log('Going back to mode selection');
      sceneEl.emit('gamemode', 'touch', false);
    });
  },
  
  remove: function () {
    // Clean up socket connection
    this.disconnect();
    
    // Remove event listener for host song selection
    this.el.sceneEl.removeEventListener('menuchallengeselect', this.onHostSongSelect);
    
    // Remove avatar customizer event listeners
    if (this.onAvatarSaved) {
      this.el.sceneEl.removeEventListener('avatarsaved', this.onAvatarSaved);
    }
    if (this.onAvatarCustomizerClosed) {
      this.el.sceneEl.removeEventListener('avatarcustomizerclosed', this.onAvatarCustomizerClosed);
    }
    
    // Remove keyboard container
    if (this.keyboardContainer && this.keyboardContainer.parentNode) {
      this.keyboardContainer.parentNode.removeChild(this.keyboardContainer);
    }
    if (this.avatarCustomizerEl && this.avatarCustomizerEl.parentNode) {
      this.avatarCustomizerEl.parentNode.removeChild(this.avatarCustomizerEl);
    }
  },

  createJoinKeyboard: function() {
    this.keyboardContainer = document.createElement('a-entity');
    this.keyboardContainer.setAttribute('visible', false);
    this.keyboardContainer.setAttribute('position', '0 1.5 -2');
    
    // Background
    const kbBg = document.createElement('a-entity');
    kbBg.setAttribute('geometry', 'primitive: plane; width: 1.4; height: 0.8');
    kbBg.setAttribute('material', 'shader: flat; color: #111; opacity: 0.95');
    kbBg.setAttribute('position', '0 0 -0.01');
    this.keyboardContainer.appendChild(kbBg);
    
    // Keyboard background/label
    const kbLabel = document.createElement('a-entity');
    kbLabel.setAttribute('mixin', 'font');
    kbLabel.setAttribute('text', {
        value: 'Enter Room Code:',
        align: 'center',
        width: 2,
        color: '#FFFFFF'
    });
    kbLabel.setAttribute('position', '0 0.30 0');
    this.keyboardContainer.appendChild(kbLabel);
    
    // Room code input display
    this.roomCodeInput = document.createElement('a-entity');
    this.roomCodeInput.setAttribute('mixin', 'font');
    this.roomCodeInput.setAttribute('text', {
        value: '____',
        align: 'center',
        width: 3,
        color: '#FFFF00'
    });
    this.roomCodeInput.setAttribute('position', '0 0.15 0');
    this.keyboardContainer.appendChild(this.roomCodeInput);
    
    // Simple number/letter buttons for room code entry
    this.currentCode = '';
    const chars = ['A','B','C','D','E','F','G','H','1','2','3','4','5','6','7','8','9','0'];
    const cols = 6;
    chars.forEach((char, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = (col - 2.5) * 0.18;
      const y = -row * 0.15;
      
      const charBtn = document.createElement('a-entity');
      charBtn.setAttribute('geometry', 'primitive: plane; width: 0.15; height: 0.12');
      charBtn.setAttribute('material', 'shader: flat; color: #333');
      charBtn.setAttribute('position', `${x} ${y} 0`);
      charBtn.setAttribute('raycastable', '');
      charBtn.setAttribute('class', 'raycastable');
      
      const charText = document.createElement('a-entity');
      charText.setAttribute('mixin', 'font');
      charText.setAttribute('text', { value: char, align: 'center', width: 1.5, color: '#FFF' });
      charText.setAttribute('position', '0 0 0.01');
      charBtn.appendChild(charText);
      
      charBtn.addEventListener('click', () => {
        if (this.currentCode.length < 4) {
          this.currentCode += char;
          this.updateCodeDisplay();
        }
      });
      charBtn.addEventListener('mouseenter', () => charBtn.setAttribute('material', 'color', '#555'));
      charBtn.addEventListener('mouseleave', () => charBtn.setAttribute('material', 'color', '#333'));
      
      this.keyboardContainer.appendChild(charBtn);
    });
    
    // Clear button
    const clearBtn = document.createElement('a-entity');
    clearBtn.setAttribute('geometry', 'primitive: plane; width: 0.3; height: 0.12');
    clearBtn.setAttribute('material', 'shader: flat; color: #553333');
    clearBtn.setAttribute('position', '-0.35 -0.45 0');
    clearBtn.setAttribute('raycastable', '');
    const clearText = document.createElement('a-entity');
    clearText.setAttribute('mixin', 'font');
    clearText.setAttribute('text', { value: 'CLEAR', align: 'center', width: 1.5, color: '#FFF' });
    clearText.setAttribute('position', '0 0 0.01');
    clearBtn.appendChild(clearText);
    clearBtn.addEventListener('click', () => {
      this.currentCode = '';
      this.updateCodeDisplay();
    });
    clearBtn.addEventListener('mouseenter', () => clearBtn.setAttribute('material', 'color', '#774444'));
    clearBtn.addEventListener('mouseleave', () => clearBtn.setAttribute('material', 'color', '#553333'));
    this.keyboardContainer.appendChild(clearBtn);
    
    // Join button
    const joinBtn = document.createElement('a-entity');
    joinBtn.setAttribute('geometry', 'primitive: plane; width: 0.3; height: 0.12');
    joinBtn.setAttribute('material', 'shader: flat; color: #335533');
    joinBtn.setAttribute('position', '0.15 -0.45 0');
    joinBtn.setAttribute('raycastable', '');
    const joinText = document.createElement('a-entity');
    joinText.setAttribute('mixin', 'font');
    joinText.setAttribute('text', { value: 'JOIN', align: 'center', width: 1.5, color: '#FFF' });
    joinText.setAttribute('position', '0 0 0.01');
    joinBtn.appendChild(joinText);
    joinBtn.addEventListener('click', () => {
      if (this.currentCode.length === 4) {
        this.onKeyboardInput({ detail: { value: this.currentCode } });
      }
    });
    joinBtn.addEventListener('mouseenter', () => joinBtn.setAttribute('material', 'color', '#447744'));
    joinBtn.addEventListener('mouseleave', () => joinBtn.setAttribute('material', 'color', '#335533'));
    this.keyboardContainer.appendChild(joinBtn);
    
    // Cancel button
    const cancelBtn = document.createElement('a-entity');
    cancelBtn.setAttribute('geometry', 'primitive: plane; width: 0.3; height: 0.12');
    cancelBtn.setAttribute('material', 'shader: flat; color: #444');
    cancelBtn.setAttribute('position', '0.50 -0.45 0');
    cancelBtn.setAttribute('raycastable', '');
    const cancelText = document.createElement('a-entity');
    cancelText.setAttribute('mixin', 'font');
    cancelText.setAttribute('text', { value: 'CANCEL', align: 'center', width: 1.5, color: '#FFF' });
    cancelText.setAttribute('position', '0 0 0.01');
    cancelBtn.appendChild(cancelText);
    cancelBtn.addEventListener('click', () => this.hideJoinKeyboard());
    cancelBtn.addEventListener('mouseenter', () => cancelBtn.setAttribute('material', 'color', '#666'));
    cancelBtn.addEventListener('mouseleave', () => cancelBtn.setAttribute('material', 'color', '#444'));
    this.keyboardContainer.appendChild(cancelBtn);
    
    this.el.sceneEl.appendChild(this.keyboardContainer);
  },
  
  updateCodeDisplay: function() {
    const display = this.currentCode.padEnd(4, '_').split('').join(' ');
    this.roomCodeInput.setAttribute('text', 'value', display);
  },
  
  showJoinKeyboard: function() {
    // Hide the template menu
    const mpMenu = document.getElementById('multiplayerMenu');
    if (mpMenu) mpMenu.setAttribute('visible', false);
    
    this.currentCode = '';
    this.updateCodeDisplay();
    this.keyboardContainer.setAttribute('visible', true);
  },
  
  hideJoinKeyboard: function() {
    this.keyboardContainer.setAttribute('visible', false);
    // Show the template menu
    const mpMenu = document.getElementById('multiplayerMenu');
    if (mpMenu) mpMenu.setAttribute('visible', true);
  },
  
  showAvatarCustomizer: function() {
    // Create avatar customizer if it doesn't exist
    if (!this.avatarCustomizerEl) {
      this.createAvatarCustomizer();
    }
    // Hide the template menu
    const mpMenu = document.getElementById('multiplayerMenu');
    if (mpMenu) mpMenu.setAttribute('visible', false);
    this.avatarCustomizerEl.setAttribute('visible', true);
  },
  
  hideAvatarCustomizer: function() {
    if (this.avatarCustomizerEl) {
      this.avatarCustomizerEl.setAttribute('visible', false);
    }
    // Show the template menu
    const mpMenu = document.getElementById('multiplayerMenu');
    if (mpMenu) mpMenu.setAttribute('visible', true);
  },
  
  createAvatarCustomizer: function() {
    this.avatarCustomizerEl = document.createElement('a-entity');
    this.avatarCustomizerEl.setAttribute('visible', false);
    this.avatarCustomizerEl.setAttribute('position', '0 0 0');
    this.avatarCustomizerEl.setAttribute('avatar-customizer', '');
    
    // Listen for customizer events on the scene (avatar-customizer emits to scene)
    this.onAvatarSaved = (evt) => {
      this.currentAvatar = evt.detail;
      this.hideAvatarCustomizer();
      // Send avatar update to server if connected
      if (this.socket && this.currentRoomCode) {
        this.socket.emit('avatarUpdate', this.currentAvatar);
      }
    };
    
    this.onAvatarCustomizerClosed = (evt) => {
      this.hideAvatarCustomizer();
    };
    
    this.el.sceneEl.addEventListener('avatarsaved', this.onAvatarSaved);
    this.el.sceneEl.addEventListener('avatarcustomizerclosed', this.onAvatarCustomizerClosed);
    
    this.el.sceneEl.appendChild(this.avatarCustomizerEl);
  },
  
  getLocalAvatar: function() {
    // Return the current avatar settings or load from localStorage
    if (this.currentAvatar) return this.currentAvatar;
    
    const saved = localStorage.getItem('aurora-beat-avatar');
    if (saved) {
      try {
        this.currentAvatar = JSON.parse(saved);
        return this.currentAvatar;
      } catch (e) {
        console.warn('Failed to parse saved avatar:', e);
      }
    }
    
    // Return default avatar
    return {
      skinTone: 'medium',
      hairStyle: 'short',
      hairColor: 'brown',
      accessory: 'none',
      bodyColor: '#4444FF'
    };
  },
  
  onKeyboardInput: function(evt) {
    const code = evt.detail.value;
    if (code && code.length > 0) {
        if (!this.socket) this.connect();
        if (this.socket) {
            this.isHost = false;
            // Send both room code and player's mode for compatibility check
            const playerMode = this.data.hasVR ? 'classic' : 'touch';
            this.socket.emit('joinRoom', {
                roomCode: code.toUpperCase(),
                playerMode: playerMode,
                avatar: this.getLocalAvatar()
            });
            this.hideJoinKeyboard();
        }
    }
  },

  update: function (oldData) {
    try {
      const isMultiplayer = this.data.gameMode === 'multiplayer';
      const wasMultiplayer = oldData && oldData.gameMode === 'multiplayer';
      const oldEnabled = oldData && oldData.enabled;

      if (isMultiplayer && !wasMultiplayer) {
        console.log('Entering multiplayer mode');
        this.connect();
      } else if (!isMultiplayer && wasMultiplayer) {
        console.log('Leaving multiplayer mode');
        this.disconnect();
      }
      
      // Fallback to manual enabled check if gameMode isn't used
      if (this.data.enabled && !oldEnabled && !this.socket) {
        this.connect();
      } else if (!this.data.enabled && oldEnabled && !isMultiplayer) {
        this.disconnect();
      }

      // Send score update if connected and score changed
      if (this.socket && isMultiplayer) {
          if (this.data.score !== (oldData && oldData.score) || this.data.combo !== (oldData && oldData.combo)) {
              this.socket.emit('scoreUpdate', {
                  score: this.data.score,
                  combo: this.data.combo
              });
          }
      }
    } catch (e) {
      console.error('Multiplayer update failed:', e);
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
    try {
      this.socket = io(url);
      if (!this.socket || typeof this.socket.emit !== 'function') {
        console.error('Socket.io failed to initialize properly');
        this.socket = null;
        return;
      }
    } catch (e) {
      console.error('Failed to connect to multiplayer server:', e);
      this.socket = null;
      return;
    }

    this.socket.on('connect', this.onConnect);
    this.socket.on('roomJoined', this.onRoomJoined);
    this.socket.on('newPlayer', this.onNewPlayer);
    this.socket.on('playerMoved', this.onPlayerMoved);
    this.socket.on('playerScoreUpdated', this.onPlayerScoreUpdated);
    this.socket.on('playerDisconnected', this.onPlayerDisconnected);
    this.socket.on('error', this.onError);
    this.socket.on('songSelected', this.onSongSelected);
    this.socket.on('playerReady', this.onPlayerReady);
    this.socket.on('countdown', this.onCountdown);
    this.socket.on('startSong', this.onStartSong);
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
    // Clear room code display
    const roomCodeEl = document.getElementById('mpRoomCode');
    if (roomCodeEl) roomCodeEl.setAttribute('text', 'value', '');
  },

  onConnect: function () {
    console.log('Connected to multiplayer server with ID:', this.socket.id);
  },

  onRoomJoined: function (data) {
    console.log('Joined room:', data);
    this.currentRoomCode = data.code;
    
    // Update room code display
    const roomCodeEl = document.getElementById('mpRoomCode');
    if (roomCodeEl) {
        roomCodeEl.setAttribute('text', 'value', `Room: ${data.code} (${data.mode})`);
    }
    
    // Update status
    const statusEl = document.getElementById('mpStatus');
    if (statusEl) {
        statusEl.setAttribute('text', 'value', 
            this.isHost ? 'You are the host. Pick a song!' : 'Waiting for host to select a song...');
    }
    
    // Update players list
    this.updatePlayersList(data.players);
    
    // Clear existing players
    Object.keys(this.otherPlayers).forEach(id => this.removePlayer(id));
    
    // Add current players
    Object.keys(data.players).forEach(id => {
      if (id === this.socket.id) return;
      this.addPlayer(data.players[id]);
    });
    
    // If host, listen for song selection events (use pre-bound function)
    if (this.isHost) {
        this.el.sceneEl.addEventListener('menuchallengeselect', this.onHostSongSelect);
    }
  },
  
  updatePlayersList: function(players) {
    const playersListEl = document.getElementById('mpPlayersList');
    if (!playersListEl) return;
    const playerIds = Object.keys(players);
    const playerList = playerIds.map((id, i) => {
        const isMe = this.socket && id === this.socket.id;
        const ready = this.playersReady[id] ? '✓' : '○';
        return `${ready} Player ${i + 1}${isMe ? ' (You)' : ''}`;
    }).join('\n');
    playersListEl.setAttribute('text', 'value', playerList);
  },
  
  onHostSongSelect: function(evt) {
    if (!this.isHost || !this.socket || !this.currentRoomCode) return;
    const challenge = evt.detail;
    if (challenge && challenge.id) {
        console.log('Host selected song:', challenge);
        this.socket.emit('selectSong', {
            id: challenge.id,
            version: challenge.version,
            difficulty: challenge.selectedDifficulty,
            mode: challenge.mode
        });
    }
  },
  
  onSongSelected: function(data) {
    console.log('Song selected by host:', data);
    const statusEl = document.getElementById('mpStatus');
    if (statusEl) {
        statusEl.setAttribute('text', 'value', 'Song selected! Click READY to start.');
    }
    
    // Store song info for when we start
    this.pendingSong = data;
    
    // If not host, load the song preview or wait for ready
    if (!this.isHost) {
        // Emit event to load the song in the menu
        this.el.sceneEl.emit('multiplayersongselected', data, false);
    }
  },
  
  onPlayerReady: function(data) {
    console.log('Player ready:', data);
    this.playersReady[data.playerId] = true;
    
    // Update UI
    const statusEl = document.getElementById('mpStatus');
    if (statusEl) {
        statusEl.setAttribute('text', 'value', `${data.readyCount}/${data.totalPlayers} players ready`);
    }
    
    // Update players list with ready status
    // (We'd need the full players object here, simplified for now)
  },
  
  onCountdown: function(data) {
    console.log('Countdown:', data.count);
    const statusEl = document.getElementById('mpStatus');
    if (statusEl) {
        if (data.count > 0) {
            statusEl.setAttribute('text', 'value', `Starting in ${data.count}...`);
            statusEl.setAttribute('text', 'color', '#FFFF00');
        } else {
            statusEl.setAttribute('text', 'value', 'GO!');
            statusEl.setAttribute('text', 'color', '#00FF00');
        }
    }
  },
  
  onStartSong: function(data) {
    console.log('Starting song!', data);
    // Hide multiplayer menu (template-based)
    const mpMenu = document.getElementById('multiplayerMenu');
    if (mpMenu) mpMenu.setAttribute('visible', false);
    
    // Emit event to start the song
    this.el.sceneEl.emit('multiplayerstartgame', data, false);
  },

  onError: function(data) {
      console.error('Multiplayer Error:', data);
      // Show error in status text
      const statusEl = document.getElementById('mpStatus');
      if (statusEl) {
          statusEl.setAttribute('text', 'value', data.message || 'An error occurred');
          statusEl.setAttribute('text', 'color', '#FF4444');
      }
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
    
    // Use player-avatar component if available and player has avatar data
    const avatarData = playerData.avatar || {};
    playerEl.setAttribute('player-avatar', {
      playerId: playerData.id,
      skinTone: avatarData.skinTone || 'medium',
      hairStyle: avatarData.hairStyle || 'short',
      hairColor: avatarData.hairColor || 'brown',
      accessory: avatarData.accessory || 'none',
      bodyColor: avatarData.bodyColor || '#FF4444',
      isLocal: false,
      showSabers: this.data.hasVR
    });

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
    if (!this.socket) return;
    if (this.data.gameMode !== 'multiplayer' && !this.data.enabled) return;

    const camera = this.el.sceneEl.camera;
    if (!camera || !camera.el) return;

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
