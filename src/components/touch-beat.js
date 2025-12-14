/**
 * Touch/Click mode for playing without VR.
 * Allows users to tap/click on beats to hit them.
 * Works on desktop with mouse and on touch devices.
 */
AFRAME.registerComponent('touch-beat', {
  schema: {
    enabled: { default: false }
  },

  init: function () {
    try {
      this.onBeatClick = this.onBeatClick.bind(this);
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.camera = null;
      this.beatContainer = null;
      
      // Bind event handlers
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onTouchStart = this.onTouchStart.bind(this);
      
      // Wait for scene to load
      const setup = () => {
        this.camera = this.el.sceneEl.camera;
        this.beatContainer = document.getElementById('beatContainer');
        console.log('[touch-beat] setup complete. Camera:', this.camera);
      };

      if (this.el.sceneEl.hasLoaded) {
        setup();
      } else {
        this.el.sceneEl.addEventListener('loaded', setup);
      }
      
      this.el.sceneEl.addEventListener('camera-set-active', (evt) => {
        this.camera = evt.detail.camera;
        console.log('[touch-beat] camera-set-active. Camera:', this.camera);
      });
    } catch (e) {
      console.error('TouchBeat init failed:', e);
    }
  },

  update: function (oldData) {
    try {
      const canvas = this.el.sceneEl.canvas;
      if (!canvas) return;
      
      const oldEnabled = oldData ? oldData.enabled : false;
      
      if (this.data.enabled && !oldEnabled) {
        // Enable touch/click mode
        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        console.log('Touch beat mode enabled');
      } else if (!this.data.enabled && oldEnabled) {
        // Disable touch/click mode
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        console.log('Touch beat mode disabled');
      }
    } catch (e) {
      console.error('TouchBeat update failed:', e);
    }
  },

  remove: function () {
    const canvas = this.el.sceneEl.canvas;
    if (canvas) {
      canvas.removeEventListener('mousedown', this.onMouseDown);
      canvas.removeEventListener('touchstart', this.onTouchStart);
    }
  },

  onMouseDown: function (evt) {
    if (!this.data.enabled) return;
    
    const canvas = this.el.sceneEl.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate normalized device coordinates
    this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.checkBeatHit();
  },

  onTouchStart: function (evt) {
    if (!this.data.enabled) return;
    if (!evt.touches || evt.touches.length === 0) return;
    
    const touch = evt.touches[0];
    const canvas = this.el.sceneEl.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate normalized device coordinates
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.checkBeatHit();
  },

  checkBeatHit: function () {
    if (!this.camera || !this.beatContainer) return;
    
    // Update raycaster from camera
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get all beat meshes
    const beatEls = this.beatContainer.querySelectorAll('[beat]');
    const objects = [];
    
    beatEls.forEach(beatEl => {
      if (beatEl.object3D && beatEl.object3D.visible) {
        // Get all meshes from the beat entity
        beatEl.object3D.traverse(node => {
          if (node.isMesh) {
            node.userData.beatEl = beatEl;
            objects.push(node);
          }
        });
      }
    });
    
    // Check intersections
    const intersects = this.raycaster.intersectObjects(objects);
    
    if (intersects.length > 0) {
      // Hit the closest beat
      const hitObject = intersects[0].object;
      const beatEl = hitObject.userData.beatEl;
      
      if (beatEl) {
        // Trigger hit on the beat
        const beatComponent = beatEl.components.beat;
        if (beatComponent && !beatComponent.destroyed) {
          // Create a mock weapon element for the hit
          const mockWeaponEl = {
            components: {
              haptics__beat: { pulse: function() {}, data: { enabled: false } },
              blade: { strokeDirectionVector: new THREE.Vector3(0, -1, 0), strokeSpeed: 10, data: { enabled: false } },
              punch: { speed: 10, data: { enabled: false } },
              trail: { pulse: function() {}, data: { enabled: false } }
            },
            dataset: { hand: 'right' }
          };
          
          try {
            beatComponent.onHit(mockWeaponEl);
          } catch (err) {
            console.error('[touch-beat] Error in onHit:', err);
          }
          
          // Show hit effect
          this.showHitEffect(intersects[0].point);
        }
      }
    }
  },
  
  showHitEffect: function(position) {
    // Create a small explosion/spark at the hit point
    const effect = document.createElement('a-entity');
    effect.setAttribute('position', position);
    effect.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
    effect.setAttribute('material', 'color: #FFF; shader: flat; transparent: true; opacity: 1');
    effect.setAttribute('animation', 'property: scale; to: 2 2 2; dur: 200; easing: easeOutQuad');
    effect.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 200; easing: easeOutQuad');
    
    this.el.sceneEl.appendChild(effect);
    
    setTimeout(() => {
      if (effect.parentNode) {
        effect.parentNode.removeChild(effect);
      }
    }, 200);
  }
});

/**
 * Touch cursor component - shows a visual indicator where the user is pointing.
 */
AFRAME.registerComponent('touch-cursor', {
  schema: {
    enabled: { default: false }
  },

  init: function () {
    try {
      // Create cursor visual
      this.cursorEl = document.createElement('a-entity');
      this.cursorEl.setAttribute('geometry', 'primitive: ring; radiusInner: 0.01; radiusOuter: 0.015');
      this.cursorEl.setAttribute('material', 'color: #FFFFFF; shader: flat; opacity: 0.8');
      this.cursorEl.setAttribute('position', '0 0 -1');
      this.cursorEl.setAttribute('visible', false);
      
      // Wait for camera to be ready before appending cursor
      this.cameraReady = false;
      const setupCamera = () => {
        if (this.el.sceneEl.camera && this.el.sceneEl.camera.el) {
          this.el.sceneEl.camera.el.appendChild(this.cursorEl);
          this.cameraReady = true;
          console.log('[touch-cursor] Cursor appended to camera');
        } else {
          console.warn('[touch-cursor] Camera not ready yet');
        }
      };
      
      if (this.el.sceneEl.hasLoaded) {
        setupCamera();
      } else {
        this.el.sceneEl.addEventListener('loaded', setupCamera);
      }

      this.el.sceneEl.addEventListener('camera-set-active', (evt) => {
        if (evt.detail.cameraEl) {
          evt.detail.cameraEl.appendChild(this.cursorEl);
          this.cameraReady = true;
          console.log('[touch-cursor] Cursor appended to new active camera');
        }
      });
      
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onTouchMove = this.onTouchMove.bind(this);
    } catch (e) {
      console.error('TouchCursor init failed:', e);
    }
  },

  update: function (oldData) {
    try {
      const canvas = this.el.sceneEl.canvas;
      if (!canvas) return;
      
      const oldEnabled = oldData ? oldData.enabled : false;
      
      if (this.data.enabled && !oldEnabled) {
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
        if (this.cursorEl) this.cursorEl.setAttribute('visible', true);
      } else if (!this.data.enabled && oldEnabled) {
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        if (this.cursorEl) this.cursorEl.setAttribute('visible', false);
      }
    } catch (e) {
      console.error('TouchCursor update failed:', e);
    }
  },

  remove: function () {
    const canvas = this.el.sceneEl.canvas;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.onMouseMove);
      canvas.removeEventListener('touchmove', this.onTouchMove);
    }
    if (this.cursorEl && this.cursorEl.parentNode) {
      this.cursorEl.parentNode.removeChild(this.cursorEl);
    }
  },

  onMouseMove: function (evt) {
    this.updateCursorPosition(evt.clientX, evt.clientY);
  },

  onTouchMove: function (evt) {
    if (evt.touches && evt.touches.length > 0) {
      this.updateCursorPosition(evt.touches[0].clientX, evt.touches[0].clientY);
    }
  },

  updateCursorPosition: function (clientX, clientY) {
    const canvas = this.el.sceneEl.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Convert to normalized device coordinates
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Position cursor in 3D space based on screen position
    // The cursor is a child of the camera, so we just offset it
    if (this.cursorEl.object3D) {
      this.cursorEl.object3D.position.x = x * 0.5;
      this.cursorEl.object3D.position.y = y * 0.3;
    }
  }
});
