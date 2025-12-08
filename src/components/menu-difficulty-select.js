/**
 * Select difficulty.
 */
AFRAME.registerComponent('menu-difficulty-select', {
  init: function () {
    this.el.sceneEl.addEventListener('menuchallengeselect', () => {
      this.el.object3D.visible = false;
      setTimeout(() => {
        this.el.components.layout.update();
        this.el.object3D.visible = true;
      }, 150);
    });
  },

  events: {
    click: function (evt) {
      const item = evt.target.closest('.difficultyOption');
      if (!item) { return; }
      this.el.sceneEl.emit(
        'menudifficultyselect',
        item.dataset.difficulty,
        false);
    }
  }
});
