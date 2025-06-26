export const ANIMATION_CONFIG = {
  duration: 350, // milliseconds
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Apple-style easing
  stagger: 50, // ms delay between elements
}

export const springConfig = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}

export const layoutTransition = {
  duration: ANIMATION_CONFIG.duration / 1000,
  ease: [0.25, 0.46, 0.45, 0.94],
}