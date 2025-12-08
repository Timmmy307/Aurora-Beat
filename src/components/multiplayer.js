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
      
      this.createMenu();
    } catch (e) {
      console.error('Multiplayer init failed:', e);
    }
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
    
    // Remove menu elements
    if (this.menuEl && this.menuEl.parentNode) {
      this.menuEl.parentNode.removeChild(this.menuEl);
    }
    if (this.keyboardContainer && this.keyboardContainer.parentNode) {
      this.keyboardContainer.parentNode.removeChild(this.keyboardContainer);
    }
    if (this.avatarCustomizerEl && this.avatarCustomizerEl.parentNode) {
      this.avatarCustomizerEl.parentNode.removeChild(this.avatarCustomizerEl);
    }
  },

  createMenu: function() {
    // Create a simple menu for Room selection
    this.menuEl = document.createElement('a-entity');
    this.menuEl.setAttribute('visible', false);
    this.menuEl.setAttribute('position', '0 1.5 -2.5');
    
    // Background - increased height for avatar button
    const bg = document.createElement('a-entity');
    bg.setAttribute('geometry', 'primitive: plane; width: 1.5; height: 1.6');
    bg.setAttribute('material', 'shader: panelShader; brightness: 0.1; ratio: 1; borderWidth: 0.002');
    bg.setAttribute('position', '0 0 -0.01'); // Slightly behind to not block raycasts
    this.menuEl.appendChild(bg);

    // Title
    const title = document.createElement('a-entity');
    title.setAttribute('mixin', 'font');
    title.setAttribute('text', {
        value: 'MULTIPLAYER LOBBY',
        align: 'center',
        width: 3,
        color: '#FFF'
    });
    title.setAttribute('position', '0 0.55 0.01');
    this.menuEl.appendChild(title);

    // Create Classic Button (only for VR)
    this.classicButton = this.createButton('Create Classic Room', 0.45, () => {
        if (!this.socket) this.connect();
        if (this.socket) {
            this.isHost = true;
            this.socket.emit('createRoom', { mode: 'classic', avatar: this.getLocalAvatar() });
        }
    });

    // Create Punch Button (only for VR)
    this.punchButton = this.createButton('Create Punch Room', 0.30, () => {
        if (!this.socket) this.connect();
        if (this.socket) {
            this.isHost = true;
            this.socket.emit('createRoom', { mode: 'punch', avatar: this.getLocalAvatar() });
        }
    });
    
    // Create Touch Room Button (for browser/non-VR)
    this.touchButton = this.createButton('Create Touch Room', 0.15, () => {
        if (!this.socket) this.connect();
        if (this.socket) {
            this.isHost = true;
            this.socket.emit('createRoom', { mode: 'touch', avatar: this.getLocalAvatar() });
        }
    });

    // Join Button - shows keyboard
    this.createButton('Join Room', 0.0, () => {
        this.showJoinKeyboard();
    });
    
    // Avatar Customization Button
    this.avatarButton = this.createButton('Customize Avatar', -0.15, () => {
        this.showAvatarCustomizer();
    });
    
    // Ready Button (hidden until in room)
    this.readyButton = document.createElement('a-entity');
    this.readyButton.setAttribute('visible', false);
    this.readyButton.setAttribute('mixin', 'bigMenuButton');
    this.readyButton.setAttribute('position', '0 -0.30 0.01');
    this.readyButton.setAttribute('raycastable', '');
    const readyText = document.createElement('a-entity');
    readyText.setAttribute('mixin', 'font');
    readyText.setAttribute('text', { value: 'READY', align: 'center', width: 2, color: '#FFF' });
    readyText.setAttribute('position', '0 0 0.01');
    this.readyButton.appendChild(readyText);
    this.readyButton.addEventListener('click', () => {
        if (this.socket && this.currentRoomCode) {
            this.socket.emit('playerReady');
            this.readyButton.setAttribute('material', 'color', '#115511');
            readyText.setAttribute('text', 'value', 'WAITING...');
        }
    });
    this.menuEl.appendChild(this.readyButton);
    
    // Room Code Display
    this.roomCodeText = document.createElement('a-entity');
    this.roomCodeText.setAttribute('mixin', 'font');
    this.roomCodeText.setAttribute('text', {
        value: '',
        align: 'center',
        width: 3,
        color: '#FFFF00'
    });
    this.roomCodeText.setAttribute('position', '0 -0.45 0.01');
    this.menuEl.appendChild(this.roomCodeText);
    
    // Status text (countdown, waiting for players, etc.)
    this.statusText = document.createElement('a-entity');
    this.statusText.setAttribute('mixin', 'font');
    this.statusText.setAttribute('text', {
        value: '',
        align: 'center',
        width: 3,
        color: '#00FF00'
    });
    this.statusText.setAttribute('position', '0 -0.55 0.01');
    this.menuEl.appendChild(this.statusText);
    
    // Players list
    this.playersListText = document.createElement('a-entity');
    this.playersListText.setAttribute('mixin', 'font');
    this.playersListText.setAttribute('text', {
        value: '',
        align: 'center',
        width: 2.5,
        color: '#AAAAAA'
    });
    this.playersListText.setAttribute('position', '0 -0.65 0.01');
    this.menuEl.appendChild(this.playersListText);

    this.el.sceneEl.appendChild(this.menuEl);
    
    // Create the join keyboard (hidden by default)
    this.createJoinKeyboard();
  },
  
  createJoinKeyboard: function() {
    this.keyboardContainer = document.createElement('a-entity');
    this.keyboardContainer.setAttribute('visible', false);
    this.keyboardContainer.setAttribute('position', '0 1.2 -0.8');
    
    // Keyboard background/label
    const kbLabel = document.createElement('a-entity');
    kbLabel.setAttribute('mixin', 'font');
    kbLabel.setAttribute('text', {
        value: 'Enter Room Code:',
        align: 'center',
        width: 2,
        color: '#FFFFFF'
    });
    kbLabel.setAttribute('position', '0 0.35 0');
    this.keyboardContainer.appendChild(kbLabel);
    
    // Keyboard entity
    this.roomCodeKeyboard = document.createElement('a-entity');
    this.roomCodeKeyboard.setAttribute('super-keyboard', {
        label: '',
        inputColor: '#fff',
        labelColor: '#aaa',
        width: 1.2,
        imagePath: 'assets/img/keyboard',
        font: 'assets/fonts/Viga-Regular.json',
        align: 'center',
        model: 'superkeyboard',
        keyColor: '#fff',
        injectToRaycasterObjects: true,
        filters: 'allupper',
        keyHoverColor: '#fff',
        maxLength: 4
    });
    this.roomCodeKeyboard.setAttribute('raycastable', '');
    this.roomCodeKeyboard.classList.add('keyboardRaycastable');
    this.roomCodeKeyboard.addEventListener('superkeyboardinput', this.onKeyboardInput);
    this.roomCodeKeyboard.addEventListener('superkeyboarddismiss', () => {
        this.hideJoinKeyboard();
    });
    this.keyboardContainer.appendChild(this.roomCodeKeyboard);
    
    // Cancel button
    const cancelBtn = document.createElement('a-entity');
    cancelBtn.setAttribute('mixin', 'bigMenuButton');
    cancelBtn.setAttribute('geometry', 'width: 0.4; height: 0.1');
    cancelBtn.setAttribute('position', '0 -0.35 0');
    cancelBtn.setAttribute('raycastable', '');
    const cancelText = document.createElement('a-entity');
    cancelText.setAttribute('mixin', 'font');
    cancelText.setAttribute('text', { value: 'Cancel', align: 'center', width: 1.5, color: '#FFF' });
    cancelText.setAttribute('position', '0 0 0.01');
    cancelBtn.appendChild(cancelText);
    cancelBtn.addEventListener('click', () => this.hideJoinKeyboard());
    this.keyboardContainer.appendChild(cancelBtn);
    
    this.el.sceneEl.appendChild(this.keyboardContainer);
  },
  
  showJoinKeyboard: function() {
    this.menuEl.setAttribute('visible', false);
    this.keyboardContainer.setAttribute('visible', true);
    this.roomCodeKeyboard.setAttribute('super-keyboard', 'show', true);
    this.roomCodeKeyboard.setAttribute('super-keyboard', 'value', '');
  },
  
  hideJoinKeyboard: function() {
    this.keyboardContainer.setAttribute('visible', false);
    this.roomCodeKeyboard.setAttribute('super-keyboard', 'show', false);
    this.menuEl.setAttribute('visible', true);
  },
  
  showAvatarCustomizer: function() {
    // Create avatar customizer if it doesn't exist
    if (!this.avatarCustomizerEl) {
      this.createAvatarCustomizer();
    }
    this.menuEl.setAttribute('visible', false);
    this.avatarCustomizerEl.setAttribute('visible', true);
  },
  
  hideAvatarCustomizer: function() {
    if (this.avatarCustomizerEl) {
      this.avatarCustomizerEl.setAttribute('visible', false);
    }
    this.menuEl.setAttribute('visible', true);
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

  createButton: function(label, y, callback) {
    const btn = document.createElement('a-entity');
    btn.setAttribute('mixin', 'bigMenuButton');
    btn.setAttribute('position', `0 ${y} 0.01`);
    btn.setAttribute('raycastable', ''); // Make sure raycaster can hit it
    btn.classList.add('raycastable'); // Add class as fallback
    
    const text = document.createElement('a-entity');
    text.setAttribute('mixin', 'font');
    text.setAttribute('text', { value: label, align: 'center', width: 2, color: '#FFF' });
    text.setAttribute('position', '0 0 0.01');
    btn.appendChild(text);

    btn.addEventListener('click', (evt) => {
        console.log('Button clicked:', label);
        callback(evt);
    });
    
    this.menuEl.appendChild(btn);
    return btn;
  },

  update: function (oldData) {
    try {
      const isMultiplayer = this.data.gameMode === 'multiplayer';
      const wasMultiplayer = oldData && oldData.gameMode === 'multiplayer';
      const oldEnabled = oldData && oldData.enabled;

      // Update button visibility based on VR status
      if ((oldData && this.data.hasVR !== oldData.hasVR) || isMultiplayer !== wasMultiplayer) {
        this.updateButtonVisibility();
      }

      if (isMultiplayer && !wasMultiplayer) {
        this.connect();
        if (this.menuEl) this.menuEl.setAttribute('visible', true);
      } else if (!isMultiplayer && wasMultiplayer) {
        this.disconnect();
        if (this.menuEl) this.menuEl.setAttribute('visible', false);
      }
      
      // Fallback to manual enabled check if gameMode isn't used
      if (this.data.enabled && !oldEnabled && !this.socket) {
        this.connect();
        if (this.menuEl) this.menuEl.setAttribute('visible', true);
      } else if (!this.data.enabled && oldEnabled && !isMultiplayer) {
        this.disconnect();
        if (this.menuEl) this.menuEl.setAttribute('visible', false);
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
  
  updateButtonVisibility: function() {
    // For non-VR (browser/touch) users: only show touch room creation
    // For VR users: show classic and punch room creation
    if (this.classicButton) {
      this.classicButton.setAttribute('visible', this.data.hasVR);
    }
    if (this.punchButton) {
      this.punchButton.setAttribute('visible', this.data.hasVR);
    }
    if (this.touchButton) {
      this.touchButton.setAttribute('visible', !this.data.hasVR);
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
    if (this.roomCodeText) this.roomCodeText.setAttribute('text', 'value', '');
  },

  onConnect: function () {
    console.log('Connected to multiplayer server with ID:', this.socket.id);
  },

  onRoomJoined: function (data) {
    console.log('Joined room:', data);
    this.currentRoomCode = data.code;
    if (this.roomCodeText) {
        this.roomCodeText.setAttribute('text', 'value', `Room: ${data.code} (${data.mode})`);
    }
    
    // Show ready button once in room
    if (this.readyButton) {
        this.readyButton.setAttribute('visible', true);
    }
    
    // Update status
    if (this.statusText) {
        const playerCount = Object.keys(data.players).length;
        this.statusText.setAttribute('text', 'value', 
            this.isHost ? 'You are the host. Pick a song when everyone is ready!' : 'Waiting for host to select a song...');
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
    if (!this.playersListText) return;
    const playerIds = Object.keys(players);
    const playerList = playerIds.map((id, i) => {
        const isMe = this.socket && id === this.socket.id;
        const ready = this.playersReady[id] ? '✓' : '○';
        return `${ready} Player ${i + 1}${isMe ? ' (You)' : ''}`;
    }).join('\n');
    this.playersListText.setAttribute('text', 'value', playerList);
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
    if (this.statusText) {
        this.statusText.setAttribute('text', 'value', 'Song selected! Click READY to start.');
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
    if (this.statusText) {
        this.statusText.setAttribute('text', 'value', `${data.readyCount}/${data.totalPlayers} players ready`);
    }
    
    // Update players list with ready status
    // (We'd need the full players object here, simplified for now)
  },
  
  onCountdown: function(data) {
    console.log('Countdown:', data.count);
    if (this.statusText) {
        if (data.count > 0) {
            this.statusText.setAttribute('text', 'value', `Starting in ${data.count}...`);
            this.statusText.setAttribute('text', 'color', '#FFFF00');
        } else {
            this.statusText.setAttribute('text', 'value', 'GO!');
            this.statusText.setAttribute('text', 'color', '#00FF00');
        }
    }
  },
  
  onStartSong: function(data) {
    console.log('Starting song!', data);
    // Hide multiplayer menu
    if (this.menuEl) this.menuEl.setAttribute('visible', false);
    
    // Emit event to start the song
    this.el.sceneEl.emit('multiplayerstartgame', data, false);
  },

  onError: function(data) {
      console.error('Multiplayer Error:', data);
      // Show error in status text instead of alert
      if (this.statusText) {
          this.statusText.setAttribute('text', 'value', data.message || 'An error occurred');
          this.statusText.setAttribute('text', 'color', '#FF4444');
      }
      // Reset ready button if visible
      if (this.readyButton && this.readyButton.getAttribute('visible')) {
          this.readyButton.setAttribute('material', 'color', '#228822');
          const readyTextEl = this.readyButton.querySelector('a-entity');
          if (readyTextEl) {
              readyTextEl.setAttribute('text', 'value', 'READY');
          }
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
