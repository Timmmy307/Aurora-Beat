AFRAME.registerComponent('difficulty-filter', {
  events: {
    click: function (evt) {
      const item = evt.target.closest('.difficultyFilterOption');
      if (!item) { return; }
      this.el.sceneEl.emit('difficultyfilter', item.dataset.difficultyFilter);
    }
  }
});
