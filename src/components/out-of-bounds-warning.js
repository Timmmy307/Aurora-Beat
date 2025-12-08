AFRAME.registerComponent('out-of-bounds-warning', {
  schema: {
    enabled: {default: true},
    isPlaying: {default: false},
    threshold: {default: 0.5} // Meters from center
  },

  init: function () {
    this.warningEl = document.getElementById('outOfBoundsText');
    this.tick = AFRAME.utils.throttleTick(this.tick, 200, this);
  },

  tick: function () {
    // Safety checks to prevent crashes
    if (!this.data.enabled || !this.data.isPlaying) { 
      if (this.isWarning && this.warningEl) {
        this.isWarning = false;
        this.warningEl.setAttribute('visible', false);
      }
      return; 
    }

    if (!this.warningEl) {
      this.warningEl = document.getElementById('outOfBoundsText');
      if (!this.warningEl) return; // Still not found, abort
    }

    const scene = this.el.sceneEl;
    if (!scene || !scene.camera || !scene.camera.el) { return; }

    // Check horizontal distance from center (0,0)
    const position = scene.camera.el.object3D.position;
    const distance = Math.sqrt(position.x * position.x + position.z * position.z);

    if (distance > this.data.threshold) {
      if (!this.isWarning) {
        this.isWarning = true;
        this.warningEl.setAttribute('visible', true);
        // Optional: Emit pause event if you want to force pause
        // this.el.sceneEl.emit('pausegame', null, false);
      }
    } else {
      if (this.isWarning) {
        this.isWarning = false;
        this.warningEl.setAttribute('visible', false);
      }
    }
  }
});
