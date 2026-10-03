// Worlds load on demand, so the mountain never pays for them up front.
// Each module's default export: (shell, monument) => { enter(), destroy?() }
export const worlds = {
  encapsulation: () => import('./encapsulation/index.js'),
  abstraction: () => import('./abstraction/index.js'),
  inheritance: () => import('./inheritance/index.js'),
  polymorphism: () => import('./polymorphism/index.js'),
};
