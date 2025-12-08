AFRAME.registerComponent('out-of-bounds-warning', {
  schema: {
    enabled: {default: true},
    isPlaying: {default: false},
    threshold: {default: 0.5} // Meters from center (approx half a step)
  },

  init: function () {
    this.warningEl = document.getElementById('outOfBoundsText');
    this.tick = AFRAME.utils.throttleTick(this.tick, 200, this);
  },

  tick: function () {
    if (!this.data.enabled || !this.data.isPlaying || !this.warningEl) { return; }

    const camera = this.el.sceneEl.camera;
    if (!camera) { return; }

    // Check horizontal distance from center (0,0) in rig space.
    // Assuming camera is child of rig, and rig is at (0,0,0) of play space.
    // We use local position of camera object.
    const position = camera.el.object3D.position;
    const distance = Math.sqrt(position.x * position.x + position.z * position.z);

    if (distance > this.data.threshold) {
      if (!this.isWarning) {
        this.isWarning = true;
        this.warningEl.setAttribute('visible', true);
        this.el.sceneEl.emit('pausegame', null, false);
      }
    } else {
      if (this.isWarning) {
        this.isWarning = false;
        this.warningEl.setAttribute('visible', false);
      }
    }
  }
});
