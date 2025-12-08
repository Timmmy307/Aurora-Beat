/**
 * Player Avatar Component
 * Creates a customizable avatar with hair, skin tone, and accessories.
 * Used for multiplayer to show other players.
 */

// Avatar customization options
const SKIN_TONES = {
  light: '#FFE0BD',
  fair: '#FFCD94',
  medium: '#EAC086',
  olive: '#C68642',
  tan: '#8D5524',
  brown: '#6B4423',
  dark: '#4A2912',
  deep: '#2D1810'
};

const HAIR_COLORS = {
  black: '#1a1a1a',
  darkBrown: '#3D2314',
  brown: '#6B4423',
  lightBrown: '#A67B5B',
  blonde: '#E8D5B7',
  platinum: '#E8E4E1',
  red: '#8B2500',
  ginger: '#C45628',
  gray: '#808080',
  white: '#F5F5F5',
  blue: '#4169E1',
  purple: '#8B008B',
  pink: '#FF69B4',
  green: '#228B22'
};

const HAIR_STYLES = {
  none: 'none',
  short: 'short',
  medium: 'medium',
  long: 'long',
  spiky: 'spiky',
  mohawk: 'mohawk',
  ponytail: 'ponytail',
  bun: 'bun',
  afro: 'afro',
  braids: 'braids'
};

const ACCESSORIES = {
  none: 'none',
  glasses: 'glasses',
  sunglasses: 'sunglasses',
  headphones: 'headphones',
  hat: 'hat',
  beanie: 'beanie',
  bandana: 'bandana'
};

// Default avatar configuration
const DEFAULT_AVATAR = {
  skinTone: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
  accessory: 'none',
  bodyColor: '#4444FF'
};

AFRAME.registerComponent('player-avatar', {
  schema: {
    playerId: { default: '' },
    skinTone: { default: 'medium' },
    hairStyle: { default: 'short' },
    hairColor: { default: 'brown' },
    accessory: { default: 'none' },
    bodyColor: { default: '#4444FF' },
    isLocal: { default: false },
    showSabers: { default: true }
  },

  init: function () {
    this.createAvatar();
  },

  update: function (oldData) {
    // Rebuild avatar if any appearance property changes
    if (this.data.skinTone !== oldData.skinTone ||
        this.data.hairStyle !== oldData.hairStyle ||
        this.data.hairColor !== oldData.hairColor ||
        this.data.accessory !== oldData.accessory ||
        this.data.bodyColor !== oldData.bodyColor) {
      this.createAvatar();
    }
  },

  createAvatar: function () {
    // Clear existing avatar parts
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild);
    }

    const skinColor = SKIN_TONES[this.data.skinTone] || SKIN_TONES.medium;
    const hairColor = HAIR_COLORS[this.data.hairColor] || HAIR_COLORS.brown;

    // Create head
    this.createHead(skinColor);
    
    // Create hair
    this.createHair(hairColor);
    
    // Create body/torso
    this.createBody();
    
    // Create hands/arms
    this.createHands(skinColor);
    
    // Create accessory
    this.createAccessory();
    
    // Create sabers (for VR modes)
    if (this.data.showSabers) {
      this.createSabers();
    }
    
    // Create score display
    this.createScoreDisplay();
    
    // Create name tag
    this.createNameTag();
  },

  createHead: function (skinColor) {
    // Main head (slightly rounded look using sphere)
    const head = document.createElement('a-entity');
    head.classList.add('avatar-head');
    head.setAttribute('geometry', 'primitive: sphere; radius: 0.12; segmentsWidth: 16; segmentsHeight: 12');
    head.setAttribute('material', `color: ${skinColor}; shader: flat`);
    head.setAttribute('position', '0 0 0');
    this.el.appendChild(head);

    // Face features
    // Eyes
    const leftEye = document.createElement('a-entity');
    leftEye.setAttribute('geometry', 'primitive: sphere; radius: 0.02');
    leftEye.setAttribute('material', 'color: #FFFFFF; shader: flat');
    leftEye.setAttribute('position', '-0.04 0.02 0.1');
    head.appendChild(leftEye);

    const leftPupil = document.createElement('a-entity');
    leftPupil.setAttribute('geometry', 'primitive: sphere; radius: 0.01');
    leftPupil.setAttribute('material', 'color: #333333; shader: flat');
    leftPupil.setAttribute('position', '0 0 0.015');
    leftEye.appendChild(leftPupil);

    const rightEye = document.createElement('a-entity');
    rightEye.setAttribute('geometry', 'primitive: sphere; radius: 0.02');
    rightEye.setAttribute('material', 'color: #FFFFFF; shader: flat');
    rightEye.setAttribute('position', '0.04 0.02 0.1');
    head.appendChild(rightEye);

    const rightPupil = document.createElement('a-entity');
    rightPupil.setAttribute('geometry', 'primitive: sphere; radius: 0.01');
    rightPupil.setAttribute('material', 'color: #333333; shader: flat');
    rightPupil.setAttribute('position', '0 0 0.015');
    rightEye.appendChild(rightPupil);

    // Simple smile
    const mouth = document.createElement('a-entity');
    mouth.setAttribute('geometry', 'primitive: plane; width: 0.06; height: 0.015');
    mouth.setAttribute('material', 'color: #CC6666; shader: flat; side: double');
    mouth.setAttribute('position', '0 -0.04 0.11');
    mouth.setAttribute('rotation', '10 0 0');
    head.appendChild(mouth);

    this.headEl = head;
  },

  createHair: function (hairColor) {
    if (this.data.hairStyle === 'none') return;

    const hairContainer = document.createElement('a-entity');
    hairContainer.classList.add('avatar-hair');
    hairContainer.setAttribute('position', '0 0 0');

    switch (this.data.hairStyle) {
      case 'short':
        this.createShortHair(hairContainer, hairColor);
        break;
      case 'medium':
        this.createMediumHair(hairContainer, hairColor);
        break;
      case 'long':
        this.createLongHair(hairContainer, hairColor);
        break;
      case 'spiky':
        this.createSpikyHair(hairContainer, hairColor);
        break;
      case 'mohawk':
        this.createMohawkHair(hairContainer, hairColor);
        break;
      case 'ponytail':
        this.createPonytailHair(hairContainer, hairColor);
        break;
      case 'bun':
        this.createBunHair(hairContainer, hairColor);
        break;
      case 'afro':
        this.createAfroHair(hairContainer, hairColor);
        break;
      case 'braids':
        this.createBraidsHair(hairContainer, hairColor);
        break;
    }

    this.el.appendChild(hairContainer);
  },

  createShortHair: function (container, color) {
    const hair = document.createElement('a-entity');
    hair.setAttribute('geometry', 'primitive: sphere; radius: 0.13; phiLength: 180; thetaLength: 120');
    hair.setAttribute('material', `color: ${color}; shader: flat; side: double`);
    hair.setAttribute('position', '0 0.02 -0.01');
    hair.setAttribute('rotation', '-20 0 0');
    container.appendChild(hair);
  },

  createMediumHair: function (container, color) {
    // Top part
    const hairTop = document.createElement('a-entity');
    hairTop.setAttribute('geometry', 'primitive: sphere; radius: 0.14; phiLength: 180; thetaLength: 140');
    hairTop.setAttribute('material', `color: ${color}; shader: flat; side: double`);
    hairTop.setAttribute('position', '0 0.02 -0.01');
    hairTop.setAttribute('rotation', '-20 0 0');
    container.appendChild(hairTop);

    // Side parts
    const leftSide = document.createElement('a-entity');
    leftSide.setAttribute('geometry', 'primitive: box; width: 0.06; height: 0.15; depth: 0.1');
    leftSide.setAttribute('material', `color: ${color}; shader: flat`);
    leftSide.setAttribute('position', '-0.11 -0.05 0');
    container.appendChild(leftSide);

    const rightSide = document.createElement('a-entity');
    rightSide.setAttribute('geometry', 'primitive: box; width: 0.06; height: 0.15; depth: 0.1');
    rightSide.setAttribute('material', `color: ${color}; shader: flat`);
    rightSide.setAttribute('position', '0.11 -0.05 0');
    container.appendChild(rightSide);
  },

  createLongHair: function (container, color) {
    // Top part
    const hairTop = document.createElement('a-entity');
    hairTop.setAttribute('geometry', 'primitive: sphere; radius: 0.14; phiLength: 180; thetaLength: 140');
    hairTop.setAttribute('material', `color: ${color}; shader: flat; side: double`);
    hairTop.setAttribute('position', '0 0.02 -0.01');
    hairTop.setAttribute('rotation', '-20 0 0');
    container.appendChild(hairTop);

    // Long flowing back
    const back = document.createElement('a-entity');
    back.setAttribute('geometry', 'primitive: box; width: 0.24; height: 0.35; depth: 0.08');
    back.setAttribute('material', `color: ${color}; shader: flat`);
    back.setAttribute('position', '0 -0.15 -0.08');
    container.appendChild(back);

    // Side parts
    const leftSide = document.createElement('a-entity');
    leftSide.setAttribute('geometry', 'primitive: box; width: 0.06; height: 0.28; depth: 0.1');
    leftSide.setAttribute('material', `color: ${color}; shader: flat`);
    leftSide.setAttribute('position', '-0.11 -0.1 0.02');
    container.appendChild(leftSide);

    const rightSide = document.createElement('a-entity');
    rightSide.setAttribute('geometry', 'primitive: box; width: 0.06; height: 0.28; depth: 0.1');
    rightSide.setAttribute('material', `color: ${color}; shader: flat`);
    rightSide.setAttribute('position', '0.11 -0.1 0.02');
    container.appendChild(rightSide);
  },

  createSpikyHair: function (container, color) {
    // Multiple spikes
    for (let i = 0; i < 7; i++) {
      const spike = document.createElement('a-entity');
      spike.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.03; radiusTop: 0; height: 0.12');
      spike.setAttribute('material', `color: ${color}; shader: flat`);
      const angle = (i / 7) * Math.PI - Math.PI / 2;
      const x = Math.sin(angle) * 0.06;
      const z = Math.cos(angle) * 0.04;
      spike.setAttribute('position', `${x} 0.12 ${z}`);
      spike.setAttribute('rotation', `${-20 + Math.random() * 20} 0 ${(i - 3) * 15}`);
      container.appendChild(spike);
    }
  },

  createMohawkHair: function (container, color) {
    // Central mohawk strip
    for (let i = 0; i < 5; i++) {
      const spike = document.createElement('a-entity');
      spike.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.03; radiusTop: 0; height: 0.15');
      spike.setAttribute('material', `color: ${color}; shader: flat`);
      spike.setAttribute('position', `0 0.1 ${-0.08 + i * 0.04}`);
      spike.setAttribute('rotation', '-10 0 0');
      container.appendChild(spike);
    }
  },

  createPonytailHair: function (container, color) {
    // Top base
    const hairTop = document.createElement('a-entity');
    hairTop.setAttribute('geometry', 'primitive: sphere; radius: 0.13; phiLength: 180; thetaLength: 120');
    hairTop.setAttribute('material', `color: ${color}; shader: flat; side: double`);
    hairTop.setAttribute('position', '0 0.02 -0.01');
    hairTop.setAttribute('rotation', '-20 0 0');
    container.appendChild(hairTop);

    // Ponytail
    const ponytail = document.createElement('a-entity');
    ponytail.setAttribute('geometry', 'primitive: cylinder; radius: 0.04; height: 0.25');
    ponytail.setAttribute('material', `color: ${color}; shader: flat`);
    ponytail.setAttribute('position', '0 -0.05 -0.12');
    ponytail.setAttribute('rotation', '30 0 0');
    container.appendChild(ponytail);

    // Ponytail tie
    const tie = document.createElement('a-entity');
    tie.setAttribute('geometry', 'primitive: torus; radius: 0.045; radiusTubular: 0.01');
    tie.setAttribute('material', 'color: #FF4444; shader: flat');
    tie.setAttribute('position', '0 0.05 -0.11');
    tie.setAttribute('rotation', '60 0 0');
    container.appendChild(tie);
  },

  createBunHair: function (container, color) {
    // Top base
    const hairTop = document.createElement('a-entity');
    hairTop.setAttribute('geometry', 'primitive: sphere; radius: 0.13; phiLength: 180; thetaLength: 120');
    hairTop.setAttribute('material', `color: ${color}; shader: flat; side: double`);
    hairTop.setAttribute('position', '0 0.02 -0.01');
    hairTop.setAttribute('rotation', '-20 0 0');
    container.appendChild(hairTop);

    // Bun on top
    const bun = document.createElement('a-entity');
    bun.setAttribute('geometry', 'primitive: sphere; radius: 0.07');
    bun.setAttribute('material', `color: ${color}; shader: flat`);
    bun.setAttribute('position', '0 0.15 -0.02');
    container.appendChild(bun);
  },

  createAfroHair: function (container, color) {
    // Big afro sphere
    const afro = document.createElement('a-entity');
    afro.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
    afro.setAttribute('material', `color: ${color}; shader: flat`);
    afro.setAttribute('position', '0 0.05 -0.02');
    container.appendChild(afro);
  },

  createBraidsHair: function (container, color) {
    // Top base
    const hairTop = document.createElement('a-entity');
    hairTop.setAttribute('geometry', 'primitive: sphere; radius: 0.13; phiLength: 180; thetaLength: 120');
    hairTop.setAttribute('material', `color: ${color}; shader: flat; side: double`);
    hairTop.setAttribute('position', '0 0.02 -0.01');
    hairTop.setAttribute('rotation', '-20 0 0');
    container.appendChild(hairTop);

    // Multiple braids
    for (let i = 0; i < 6; i++) {
      const braid = document.createElement('a-entity');
      braid.setAttribute('geometry', 'primitive: cylinder; radius: 0.02; height: 0.2');
      braid.setAttribute('material', `color: ${color}; shader: flat`);
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.sin(angle) * 0.1;
      const z = Math.cos(angle) * 0.1;
      braid.setAttribute('position', `${x} -0.1 ${z}`);
      braid.setAttribute('rotation', `${10 + Math.abs(z) * 20} 0 ${x * 30}`);
      container.appendChild(braid);
    }
  },

  createBody: function () {
    // Simple body/torso representation
    const body = document.createElement('a-entity');
    body.classList.add('avatar-body');
    body.setAttribute('geometry', 'primitive: cylinder; radius: 0.12; height: 0.25');
    body.setAttribute('material', `color: ${this.data.bodyColor}; shader: flat`);
    body.setAttribute('position', '0 -0.25 0');
    this.el.appendChild(body);

    // Shoulders
    const shoulders = document.createElement('a-entity');
    shoulders.setAttribute('geometry', 'primitive: box; width: 0.35; height: 0.06; depth: 0.1');
    shoulders.setAttribute('material', `color: ${this.data.bodyColor}; shader: flat`);
    shoulders.setAttribute('position', '0 -0.15 0');
    this.el.appendChild(shoulders);
  },

  createHands: function (skinColor) {
    // Left hand container
    const leftHandContainer = document.createElement('a-entity');
    leftHandContainer.classList.add('avatar-left-hand');
    leftHandContainer.setAttribute('position', '-0.3 -0.2 0.1');

    // Left arm
    const leftArm = document.createElement('a-entity');
    leftArm.setAttribute('geometry', 'primitive: cylinder; radius: 0.03; height: 0.2');
    leftArm.setAttribute('material', `color: ${this.data.bodyColor}; shader: flat`);
    leftArm.setAttribute('rotation', '0 0 45');
    leftHandContainer.appendChild(leftArm);

    // Left hand
    const leftHand = document.createElement('a-entity');
    leftHand.classList.add('hand-mesh');
    leftHand.setAttribute('geometry', 'primitive: sphere; radius: 0.05');
    leftHand.setAttribute('material', `color: ${skinColor}; shader: flat`);
    leftHand.setAttribute('position', '0 0 0');
    leftHandContainer.appendChild(leftHand);

    this.el.appendChild(leftHandContainer);
    this.leftHandEl = leftHandContainer;

    // Right hand container
    const rightHandContainer = document.createElement('a-entity');
    rightHandContainer.classList.add('avatar-right-hand');
    rightHandContainer.setAttribute('position', '0.3 -0.2 0.1');

    // Right arm
    const rightArm = document.createElement('a-entity');
    rightArm.setAttribute('geometry', 'primitive: cylinder; radius: 0.03; height: 0.2');
    rightArm.setAttribute('material', `color: ${this.data.bodyColor}; shader: flat`);
    rightArm.setAttribute('rotation', '0 0 -45');
    rightHandContainer.appendChild(rightArm);

    // Right hand
    const rightHand = document.createElement('a-entity');
    rightHand.classList.add('hand-mesh');
    rightHand.setAttribute('geometry', 'primitive: sphere; radius: 0.05');
    rightHand.setAttribute('material', `color: ${skinColor}; shader: flat`);
    rightHand.setAttribute('position', '0 0 0');
    rightHandContainer.appendChild(rightHand);

    this.el.appendChild(rightHandContainer);
    this.rightHandEl = rightHandContainer;
  },

  createSabers: function () {
    // Left saber (red)
    const leftSaber = document.createElement('a-entity');
    leftSaber.classList.add('avatar-left-saber');
    
    const leftHandle = document.createElement('a-entity');
    leftHandle.setAttribute('geometry', 'primitive: cylinder; radius: 0.02; height: 0.15');
    leftHandle.setAttribute('material', 'color: #333333; shader: flat');
    leftSaber.appendChild(leftHandle);

    const leftBlade = document.createElement('a-entity');
    leftBlade.setAttribute('geometry', 'primitive: cylinder; radius: 0.015; height: 0.6');
    leftBlade.setAttribute('material', 'color: #FF0000; shader: flat; emissive: #FF0000; emissiveIntensity: 0.5');
    leftBlade.setAttribute('position', '0 0.375 0');
    leftSaber.appendChild(leftBlade);

    if (this.leftHandEl) {
      leftSaber.setAttribute('position', '0 0 0.1');
      leftSaber.setAttribute('rotation', '90 0 0');
      this.leftHandEl.appendChild(leftSaber);
    }

    // Right saber (blue)
    const rightSaber = document.createElement('a-entity');
    rightSaber.classList.add('avatar-right-saber');
    
    const rightHandle = document.createElement('a-entity');
    rightHandle.setAttribute('geometry', 'primitive: cylinder; radius: 0.02; height: 0.15');
    rightHandle.setAttribute('material', 'color: #333333; shader: flat');
    rightSaber.appendChild(rightHandle);

    const rightBlade = document.createElement('a-entity');
    rightBlade.setAttribute('geometry', 'primitive: cylinder; radius: 0.015; height: 0.6');
    rightBlade.setAttribute('material', 'color: #0088FF; shader: flat; emissive: #0088FF; emissiveIntensity: 0.5');
    rightBlade.setAttribute('position', '0 0.375 0');
    rightSaber.appendChild(rightBlade);

    if (this.rightHandEl) {
      rightSaber.setAttribute('position', '0 0 0.1');
      rightSaber.setAttribute('rotation', '90 0 0');
      this.rightHandEl.appendChild(rightSaber);
    }
  },

  createAccessory: function () {
    if (this.data.accessory === 'none') return;

    const accessoryContainer = document.createElement('a-entity');
    accessoryContainer.classList.add('avatar-accessory');

    switch (this.data.accessory) {
      case 'glasses':
        this.createGlasses(accessoryContainer, '#333333', false);
        break;
      case 'sunglasses':
        this.createGlasses(accessoryContainer, '#111111', true);
        break;
      case 'headphones':
        this.createHeadphones(accessoryContainer);
        break;
      case 'hat':
        this.createHat(accessoryContainer);
        break;
      case 'beanie':
        this.createBeanie(accessoryContainer);
        break;
      case 'bandana':
        this.createBandana(accessoryContainer);
        break;
    }

    this.el.appendChild(accessoryContainer);
  },

  createGlasses: function (container, color, dark) {
    // Frame
    const frame = document.createElement('a-entity');
    frame.setAttribute('geometry', 'primitive: box; width: 0.12; height: 0.01; depth: 0.01');
    frame.setAttribute('material', `color: ${color}; shader: flat`);
    frame.setAttribute('position', '0 0.02 0.12');
    container.appendChild(frame);

    // Left lens
    const leftLens = document.createElement('a-entity');
    leftLens.setAttribute('geometry', 'primitive: plane; width: 0.04; height: 0.03');
    leftLens.setAttribute('material', `color: ${dark ? '#222' : '#88CCFF'}; shader: flat; opacity: ${dark ? 0.9 : 0.3}; transparent: true`);
    leftLens.setAttribute('position', '-0.04 0.02 0.125');
    container.appendChild(leftLens);

    // Right lens
    const rightLens = document.createElement('a-entity');
    rightLens.setAttribute('geometry', 'primitive: plane; width: 0.04; height: 0.03');
    rightLens.setAttribute('material', `color: ${dark ? '#222' : '#88CCFF'}; shader: flat; opacity: ${dark ? 0.9 : 0.3}; transparent: true`);
    rightLens.setAttribute('position', '0.04 0.02 0.125');
    container.appendChild(rightLens);
  },

  createHeadphones: function (container) {
    // Headband
    const headband = document.createElement('a-entity');
    headband.setAttribute('geometry', 'primitive: torus; radius: 0.14; radiusTubular: 0.015; arc: 180');
    headband.setAttribute('material', 'color: #333333; shader: flat');
    headband.setAttribute('position', '0 0.1 0');
    headband.setAttribute('rotation', '0 0 0');
    container.appendChild(headband);

    // Left ear cup
    const leftCup = document.createElement('a-entity');
    leftCup.setAttribute('geometry', 'primitive: cylinder; radius: 0.05; height: 0.03');
    leftCup.setAttribute('material', 'color: #222222; shader: flat');
    leftCup.setAttribute('position', '-0.14 0 0');
    leftCup.setAttribute('rotation', '0 0 90');
    container.appendChild(leftCup);

    // Right ear cup
    const rightCup = document.createElement('a-entity');
    rightCup.setAttribute('geometry', 'primitive: cylinder; radius: 0.05; height: 0.03');
    rightCup.setAttribute('material', 'color: #222222; shader: flat');
    rightCup.setAttribute('position', '0.14 0 0');
    rightCup.setAttribute('rotation', '0 0 90');
    container.appendChild(rightCup);
  },

  createHat: function (container) {
    // Hat base
    const base = document.createElement('a-entity');
    base.setAttribute('geometry', 'primitive: cylinder; radius: 0.15; height: 0.02');
    base.setAttribute('material', 'color: #8B4513; shader: flat');
    base.setAttribute('position', '0 0.1 0');
    container.appendChild(base);

    // Hat top
    const top = document.createElement('a-entity');
    top.setAttribute('geometry', 'primitive: cylinder; radius: 0.1; height: 0.1');
    top.setAttribute('material', 'color: #8B4513; shader: flat');
    top.setAttribute('position', '0 0.16 0');
    container.appendChild(top);
  },

  createBeanie: function (container) {
    const beanie = document.createElement('a-entity');
    beanie.setAttribute('geometry', 'primitive: sphere; radius: 0.14; phiLength: 180; thetaLength: 90');
    beanie.setAttribute('material', 'color: #FF4444; shader: flat; side: double');
    beanie.setAttribute('position', '0 0.04 0');
    beanie.setAttribute('rotation', '-10 0 0');
    container.appendChild(beanie);

    // Beanie fold
    const fold = document.createElement('a-entity');
    fold.setAttribute('geometry', 'primitive: torus; radius: 0.13; radiusTubular: 0.02; arc: 360');
    fold.setAttribute('material', 'color: #CC3333; shader: flat');
    fold.setAttribute('position', '0 0.02 0');
    fold.setAttribute('rotation', '90 0 0');
    container.appendChild(fold);
  },

  createBandana: function (container) {
    const bandana = document.createElement('a-entity');
    bandana.setAttribute('geometry', 'primitive: box; width: 0.28; height: 0.04; depth: 0.15');
    bandana.setAttribute('material', 'color: #FF6600; shader: flat');
    bandana.setAttribute('position', '0 0.08 0');
    container.appendChild(bandana);

    // Knot at back
    const knot = document.createElement('a-entity');
    knot.setAttribute('geometry', 'primitive: box; width: 0.06; height: 0.04; depth: 0.08');
    knot.setAttribute('material', 'color: #FF6600; shader: flat');
    knot.setAttribute('position', '0 0.06 -0.1');
    container.appendChild(knot);
  },

  createScoreDisplay: function () {
    const scoreText = document.createElement('a-entity');
    scoreText.classList.add('avatar-score-text');
    scoreText.setAttribute('text', {
      value: 'Score: 0',
      align: 'center',
      color: '#FFFFFF',
      width: 1.5
    });
    scoreText.setAttribute('position', '0 0.45 0');
    scoreText.setAttribute('look-at', '[camera]');
    this.el.appendChild(scoreText);
    this.scoreTextEl = scoreText;
  },

  createNameTag: function () {
    const nameTag = document.createElement('a-entity');
    nameTag.classList.add('avatar-name-tag');
    nameTag.setAttribute('text', {
      value: this.data.playerId ? `Player ${this.data.playerId.slice(-4)}` : 'Player',
      align: 'center',
      color: '#FFFF00',
      width: 1.2
    });
    nameTag.setAttribute('position', '0 0.35 0');
    nameTag.setAttribute('look-at', '[camera]');
    this.el.appendChild(nameTag);
    this.nameTagEl = nameTag;
  },

  // Update hand positions (called from multiplayer component)
  updateLeftHand: function (position, rotation) {
    if (this.leftHandEl) {
      this.leftHandEl.object3D.position.set(position.x, position.y, position.z);
      if (rotation) {
        this.leftHandEl.object3D.rotation.set(rotation.x, rotation.y, rotation.z);
      }
    }
  },

  updateRightHand: function (position, rotation) {
    if (this.rightHandEl) {
      this.rightHandEl.object3D.position.set(position.x, position.y, position.z);
      if (rotation) {
        this.rightHandEl.object3D.rotation.set(rotation.x, rotation.y, rotation.z);
      }
    }
  },

  updateScore: function (score, combo) {
    if (this.scoreTextEl) {
      this.scoreTextEl.setAttribute('text', 'value', `Score: ${score}\nCombo: ${combo}`);
    }
  },

  setPlayerName: function (name) {
    if (this.nameTagEl) {
      this.nameTagEl.setAttribute('text', 'value', name);
    }
  }
});

// Export constants for use in customization UI
if (typeof module !== 'undefined') {
  module.exports = {
    SKIN_TONES,
    HAIR_COLORS,
    HAIR_STYLES,
    ACCESSORIES,
    DEFAULT_AVATAR
  };
}
