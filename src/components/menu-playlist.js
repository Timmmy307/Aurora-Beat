AFRAME.registerComponent('menu-playlist', {
  init: function () {
    this.eventDetail = {id: '', title: ''};

    this.el.addEventListener('click', evt => {
      const item = evt.target.closest('.playlist');
      if (!item) { return; }
      this.eventDetail.id = item.dataset.playlist;
      this.eventDetail.title = item.dataset.title;
      this.el.sceneEl.emit('playlistselect', this.eventDetail);
    });
  }
});
