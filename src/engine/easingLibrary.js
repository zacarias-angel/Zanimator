/**
 * Zanimator — Easing Library
 * Catálogo de easings disponibles para el editor y el schema.
 */

export const EASINGS = [
  // Lineales
  { label: 'Linear', value: 'none' },

  // Power
  { label: 'Power1 In',    value: 'power1.in' },
  { label: 'Power1 Out',   value: 'power1.out' },
  { label: 'Power1 InOut', value: 'power1.inOut' },
  { label: 'Power2 In',    value: 'power2.in' },
  { label: 'Power2 Out',   value: 'power2.out' },
  { label: 'Power2 InOut', value: 'power2.inOut' },
  { label: 'Power3 In',    value: 'power3.in' },
  { label: 'Power3 Out',   value: 'power3.out' },
  { label: 'Power3 InOut', value: 'power3.inOut' },
  { label: 'Power4 In',    value: 'power4.in' },
  { label: 'Power4 Out',   value: 'power4.out' },
  { label: 'Power4 InOut', value: 'power4.inOut' },

  // Back
  { label: 'Back In',    value: 'back.in(1.7)' },
  { label: 'Back Out',   value: 'back.out(1.7)' },
  { label: 'Back InOut', value: 'back.inOut(1.7)' },

  // Bounce
  { label: 'Bounce In',    value: 'bounce.in' },
  { label: 'Bounce Out',   value: 'bounce.out' },
  { label: 'Bounce InOut', value: 'bounce.inOut' },

  // Elastic
  { label: 'Elastic In',    value: 'elastic.in(1, 0.3)' },
  { label: 'Elastic Out',   value: 'elastic.out(1, 0.3)' },
  { label: 'Elastic InOut', value: 'elastic.inOut(1, 0.3)' },

  // Circ
  { label: 'Circ In',    value: 'circ.in' },
  { label: 'Circ Out',   value: 'circ.out' },
  { label: 'Circ InOut', value: 'circ.inOut' },

  // Expo
  { label: 'Expo In',    value: 'expo.in' },
  { label: 'Expo Out',   value: 'expo.out' },
  { label: 'Expo InOut', value: 'expo.inOut' },

  // Sine
  { label: 'Sine In',    value: 'sine.in' },
  { label: 'Sine Out',   value: 'sine.out' },
  { label: 'Sine InOut', value: 'sine.inOut' },
]

export const DEFAULT_EASING = 'power2.out'
