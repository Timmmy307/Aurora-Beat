AFRAME.registerComponent('toggle-state-button', {
  schema: {
    property: {type: 'string'}
  },
  init: function () {
    this.el.addEventListener('click', () => {
      this.el.sceneEl.emit('togglesetting', {setting: this.data.property});
    });
  }
});
