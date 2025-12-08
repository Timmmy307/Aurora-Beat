AFRAME.registerComponent('safety-warning-button', {
  schema: {
    enabled: {default: true}
  },

  update: function () {
    const color = this.data.enabled ? '#228B22' : '#8B0000';
    const text = 'Safety Warning: ' + (this.data.enabled ? 'ON' : 'OFF');
    
    this.el.setAttribute('material', 'color', color);
    this.el.setAttribute('text', 'value', text);
  }
});
