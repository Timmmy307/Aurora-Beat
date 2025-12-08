/**
 * Avatar Customization UI Component
 * Allows players to customize their avatar appearance
 */

const SKIN_TONES = ['light', 'fair', 'medium', 'olive', 'tan', 'brown', 'dark', 'deep'];
const HAIR_STYLES = ['none', 'short', 'medium', 'long', 'spiky', 'mohawk', 'ponytail', 'bun', 'afro', 'braids'];
const HAIR_COLORS = ['black', 'darkBrown', 'brown', 'lightBrown', 'blonde', 'platinum', 'red', 'ginger', 'gray', 'white', 'blue', 'purple', 'pink', 'green'];
const ACCESSORIES = ['none', 'glasses', 'sunglasses', 'headphones', 'hat', 'beanie', 'bandana'];
const BODY_COLORS = ['#4444FF', '#FF4444', '#44FF44', '#FF44FF', '#44FFFF', '#FFFF44', '#FF8800', '#8800FF', '#0088FF', '#888888'];

const STORAGE_KEY = 'aurora-beat-avatar';

AFRAME.registerComponent('avatar-customizer', {
  schema: {
    visible: { default: false }
  },

  init: function () {
    this.currentSettings = this.loadAvatarSettings();
    this.categoryIndex = 0;
    this.categories = ['skinTone', 'hairStyle', 'hairColor', 'accessory', 'bodyColor'];
    this.categoryNames = ['Skin Tone', 'Hair Style', 'Hair Color', 'Accessory', 'Body Color'];
    
    this.onPrevCategory = this.onPrevCategory.bind(this);
    this.onNextCategory = this.onNextCategory.bind(this);
    this.onPrevOption = this.onPrevOption.bind(this);
    this.onNextOption = this.onNextOption.bind(this);
    this.onSave = this.onSave.bind(this);
    this.onCancel = this.onCancel.bind(this);
    
    this.createUI();
    this.createPreview();
    this.updateUI();
  },

  update: function (oldData) {
    if (this.data.visible !== oldData.visible) {
      this.el.object3D.visible = this.data.visible;
      if (this.data.visible) {
        this.currentSettings = this.loadAvatarSettings();
        this.updateUI();
        this.updatePreview();
      }
    }
  },

  loadAvatarSettings: function () {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved avatar settings');
      }
    }
    // Default settings
    return {
      skinTone: 'medium',
      hairStyle: 'short',
      hairColor: 'brown',
      accessory: 'none',
      bodyColor: '#4444FF'
    };
  },

  saveAvatarSettings: function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
    this.el.sceneEl.emit('avatarsaved', this.currentSettings, false);
  },

  createUI: function () {
    // Main container
    this.containerEl = document.createElement('a-entity');
    this.containerEl.setAttribute('position', '0 1.5 -1');
    
    // Background panel
    const bg = document.createElement('a-entity');
    bg.setAttribute('geometry', 'primitive: plane; width: 1.8; height: 1.4');
    bg.setAttribute('material', 'color: #1a1a2e; opacity: 0.95');
    bg.setAttribute('position', '0 0 -0.01');
    this.containerEl.appendChild(bg);

    // Title
    const title = document.createElement('a-entity');
    title.setAttribute('text', {
      value: 'CUSTOMIZE AVATAR',
      align: 'center',
      color: '#FFFFFF',
      width: 2.5
    });
    title.setAttribute('position', '0 0.55 0');
    this.containerEl.appendChild(title);

    // Category navigation
    this.createCategoryNav();
    
    // Option navigation
    this.createOptionNav();
    
    // Preview area will be on the left
    
    // Save/Cancel buttons
    this.createButtons();

    this.el.appendChild(this.containerEl);
  },

  createCategoryNav: function () {
    // Previous category button
    const prevCatBtn = document.createElement('a-entity');
    prevCatBtn.setAttribute('geometry', 'primitive: plane; width: 0.15; height: 0.1');
    prevCatBtn.setAttribute('material', 'color: #333366');
    prevCatBtn.setAttribute('position', '-0.5 0.35 0');
    prevCatBtn.classList.add('raycastable');
    
    const prevCatText = document.createElement('a-entity');
    prevCatText.setAttribute('text', { value: '<', align: 'center', color: '#FFFFFF', width: 1.5 });
    prevCatText.setAttribute('position', '0 0 0.01');
    prevCatBtn.appendChild(prevCatText);
    
    prevCatBtn.addEventListener('click', this.onPrevCategory);
    prevCatBtn.addEventListener('mouseenter', () => prevCatBtn.setAttribute('material', 'color', '#4444aa'));
    prevCatBtn.addEventListener('mouseleave', () => prevCatBtn.setAttribute('material', 'color', '#333366'));
    this.containerEl.appendChild(prevCatBtn);

    // Category name display
    this.categoryTextEl = document.createElement('a-entity');
    this.categoryTextEl.setAttribute('text', {
      value: 'Skin Tone',
      align: 'center',
      color: '#FFFF00',
      width: 2
    });
    this.categoryTextEl.setAttribute('position', '0 0.35 0');
    this.containerEl.appendChild(this.categoryTextEl);

    // Next category button
    const nextCatBtn = document.createElement('a-entity');
    nextCatBtn.setAttribute('geometry', 'primitive: plane; width: 0.15; height: 0.1');
    nextCatBtn.setAttribute('material', 'color: #333366');
    nextCatBtn.setAttribute('position', '0.5 0.35 0');
    nextCatBtn.classList.add('raycastable');
    
    const nextCatText = document.createElement('a-entity');
    nextCatText.setAttribute('text', { value: '>', align: 'center', color: '#FFFFFF', width: 1.5 });
    nextCatText.setAttribute('position', '0 0 0.01');
    nextCatBtn.appendChild(nextCatText);
    
    nextCatBtn.addEventListener('click', this.onNextCategory);
    nextCatBtn.addEventListener('mouseenter', () => nextCatBtn.setAttribute('material', 'color', '#4444aa'));
    nextCatBtn.addEventListener('mouseleave', () => nextCatBtn.setAttribute('material', 'color', '#333366'));
    this.containerEl.appendChild(nextCatBtn);
  },

  createOptionNav: function () {
    // Previous option button
    const prevOptBtn = document.createElement('a-entity');
    prevOptBtn.setAttribute('geometry', 'primitive: plane; width: 0.2; height: 0.12');
    prevOptBtn.setAttribute('material', 'color: #336633');
    prevOptBtn.setAttribute('position', '-0.4 0.15 0');
    prevOptBtn.classList.add('raycastable');
    
    const prevOptText = document.createElement('a-entity');
    prevOptText.setAttribute('text', { value: '< Prev', align: 'center', color: '#FFFFFF', width: 1.2 });
    prevOptText.setAttribute('position', '0 0 0.01');
    prevOptBtn.appendChild(prevOptText);
    
    prevOptBtn.addEventListener('click', this.onPrevOption);
    prevOptBtn.addEventListener('mouseenter', () => prevOptBtn.setAttribute('material', 'color', '#44aa44'));
    prevOptBtn.addEventListener('mouseleave', () => prevOptBtn.setAttribute('material', 'color', '#336633'));
    this.containerEl.appendChild(prevOptBtn);

    // Current option display
    this.optionTextEl = document.createElement('a-entity');
    this.optionTextEl.setAttribute('text', {
      value: 'Medium',
      align: 'center',
      color: '#FFFFFF',
      width: 1.8
    });
    this.optionTextEl.setAttribute('position', '0 0.15 0');
    this.containerEl.appendChild(this.optionTextEl);

    // Next option button
    const nextOptBtn = document.createElement('a-entity');
    nextOptBtn.setAttribute('geometry', 'primitive: plane; width: 0.2; height: 0.12');
    nextOptBtn.setAttribute('material', 'color: #336633');
    nextOptBtn.setAttribute('position', '0.4 0.15 0');
    nextOptBtn.classList.add('raycastable');
    
    const nextOptText = document.createElement('a-entity');
    nextOptText.setAttribute('text', { value: 'Next >', align: 'center', color: '#FFFFFF', width: 1.2 });
    nextOptText.setAttribute('position', '0 0 0.01');
    nextOptBtn.appendChild(nextOptText);
    
    nextOptBtn.addEventListener('click', this.onNextOption);
    nextOptBtn.addEventListener('mouseenter', () => nextOptBtn.setAttribute('material', 'color', '#44aa44'));
    nextOptBtn.addEventListener('mouseleave', () => nextOptBtn.setAttribute('material', 'color', '#336633'));
    this.containerEl.appendChild(nextOptBtn);
  },

  createButtons: function () {
    // Save button
    const saveBtn = document.createElement('a-entity');
    saveBtn.setAttribute('geometry', 'primitive: plane; width: 0.35; height: 0.12');
    saveBtn.setAttribute('material', 'color: #228822');
    saveBtn.setAttribute('position', '-0.25 -0.5 0');
    saveBtn.classList.add('raycastable');
    
    const saveText = document.createElement('a-entity');
    saveText.setAttribute('text', { value: 'SAVE', align: 'center', color: '#FFFFFF', width: 1.5 });
    saveText.setAttribute('position', '0 0 0.01');
    saveBtn.appendChild(saveText);
    
    saveBtn.addEventListener('click', this.onSave);
    saveBtn.addEventListener('mouseenter', () => saveBtn.setAttribute('material', 'color', '#33aa33'));
    saveBtn.addEventListener('mouseleave', () => saveBtn.setAttribute('material', 'color', '#228822'));
    this.containerEl.appendChild(saveBtn);

    // Cancel button
    const cancelBtn = document.createElement('a-entity');
    cancelBtn.setAttribute('geometry', 'primitive: plane; width: 0.35; height: 0.12');
    cancelBtn.setAttribute('material', 'color: #882222');
    cancelBtn.setAttribute('position', '0.25 -0.5 0');
    cancelBtn.classList.add('raycastable');
    
    const cancelText = document.createElement('a-entity');
    cancelText.setAttribute('text', { value: 'CANCEL', align: 'center', color: '#FFFFFF', width: 1.5 });
    cancelText.setAttribute('position', '0 0 0.01');
    cancelBtn.appendChild(cancelText);
    
    cancelBtn.addEventListener('click', this.onCancel);
    cancelBtn.addEventListener('mouseenter', () => cancelBtn.setAttribute('material', 'color', '#aa3333'));
    cancelBtn.addEventListener('mouseleave', () => cancelBtn.setAttribute('material', 'color', '#882222'));
    this.containerEl.appendChild(cancelBtn);
  },

  createPreview: function () {
    // Preview container on the left side
    this.previewEl = document.createElement('a-entity');
    this.previewEl.setAttribute('position', '-0.55 -0.1 0.3');
    this.previewEl.setAttribute('rotation', '0 20 0');
    this.previewEl.setAttribute('scale', '1.5 1.5 1.5');
    this.previewEl.setAttribute('player-avatar', this.currentSettings);
    
    // Add rotation animation for preview
    this.previewEl.setAttribute('animation', {
      property: 'rotation',
      from: '0 -20 0',
      to: '0 20 0',
      dur: 4000,
      dir: 'alternate',
      loop: true,
      easing: 'easeInOutQuad'
    });
    
    this.containerEl.appendChild(this.previewEl);
  },

  updatePreview: function () {
    if (this.previewEl) {
      this.previewEl.setAttribute('player-avatar', this.currentSettings);
    }
  },

  updateUI: function () {
    const category = this.categories[this.categoryIndex];
    const categoryName = this.categoryNames[this.categoryIndex];
    
    this.categoryTextEl.setAttribute('text', 'value', categoryName);
    
    // Get current option value and format for display
    let optionValue = this.currentSettings[category];
    let displayValue = this.formatOptionValue(category, optionValue);
    this.optionTextEl.setAttribute('text', 'value', displayValue);
  },

  formatOptionValue: function (category, value) {
    // Convert camelCase to Title Case
    if (typeof value === 'string' && !value.startsWith('#')) {
      return value.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    }
    // For colors, show a color indicator
    if (value.startsWith('#')) {
      return `Color: ${value}`;
    }
    return value;
  },

  getOptionsForCategory: function (category) {
    switch (category) {
      case 'skinTone': return SKIN_TONES;
      case 'hairStyle': return HAIR_STYLES;
      case 'hairColor': return HAIR_COLORS;
      case 'accessory': return ACCESSORIES;
      case 'bodyColor': return BODY_COLORS;
      default: return [];
    }
  },

  onPrevCategory: function () {
    this.categoryIndex--;
    if (this.categoryIndex < 0) {
      this.categoryIndex = this.categories.length - 1;
    }
    this.updateUI();
  },

  onNextCategory: function () {
    this.categoryIndex++;
    if (this.categoryIndex >= this.categories.length) {
      this.categoryIndex = 0;
    }
    this.updateUI();
  },

  onPrevOption: function () {
    const category = this.categories[this.categoryIndex];
    const options = this.getOptionsForCategory(category);
    const currentIndex = options.indexOf(this.currentSettings[category]);
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
      newIndex = options.length - 1;
    }
    this.currentSettings[category] = options[newIndex];
    this.updateUI();
    this.updatePreview();
  },

  onNextOption: function () {
    const category = this.categories[this.categoryIndex];
    const options = this.getOptionsForCategory(category);
    const currentIndex = options.indexOf(this.currentSettings[category]);
    let newIndex = currentIndex + 1;
    if (newIndex >= options.length) {
      newIndex = 0;
    }
    this.currentSettings[category] = options[newIndex];
    this.updateUI();
    this.updatePreview();
  },

  onSave: function () {
    this.saveAvatarSettings();
    this.el.setAttribute('avatar-customizer', 'visible', false);
    this.el.sceneEl.emit('avatarcustomizerclosed', { saved: true }, false);
  },

  onCancel: function () {
    this.currentSettings = this.loadAvatarSettings();
    this.updateUI();
    this.updatePreview();
    this.el.setAttribute('avatar-customizer', 'visible', false);
    this.el.sceneEl.emit('avatarcustomizerclosed', { saved: false }, false);
  }
});
