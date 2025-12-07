/**
 * Capture physical keyboard input and forward to super-keyboard.
 */
AFRAME.registerComponent('keyboard-input', {
  init: function () {
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
  },

  remove: function () {
    window.removeEventListener('keydown', this.onKeyDown);
  },

  onKeyDown: function (evt) {
    // Find the super-keyboard component in the scene
    const keyboardEl = document.querySelector('[super-keyboard]');
    if (!keyboardEl) { return; }

    const keyboard = keyboardEl.components['super-keyboard'];
    if (!keyboard) { return; }

    // Only capture input if the keyboard is visible
    if (!keyboardEl.getAttribute('visible')) { return; }

    // Handle Backspace
    if (evt.key === 'Backspace') {
      let value = keyboard.data.value;
      if (value.length > 0) {
        value = value.substring(0, value.length - 1);
        keyboard.data.value = value;
        keyboard.updateTextInput(value);
        keyboard.el.emit('superkeyboardchange', {value: value});
      }
      return;
    }

    // Handle regular characters (length 1)
    if (evt.key.length === 1) {
      let value = keyboard.data.value;
      // Check max length if defined
      if (keyboard.data.maxLength > 0 && value.length >= keyboard.data.maxLength) {
        return;
      }
      
      value += evt.key;
      keyboard.data.value = value;
      keyboard.updateTextInput(value);
      keyboard.el.emit('superkeyboardchange', {value: value});
    }
  }
});
