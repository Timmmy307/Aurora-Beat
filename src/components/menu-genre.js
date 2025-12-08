AFRAME.registerComponent('menu-genre', {
  init: function () {
    this.el.addEventListener('click', evt => {
      const item = evt.target.closest('.genre');
      if (!item) { return; }
      this.el.sceneEl.emit('genreselect', item.dataset.bindForKey);
    });
  }
});
