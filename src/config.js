// Single source of truth for the four monuments.
// `slice` matches the node names baked into public/models/rushmore.glb.
// `focus` is the point the camera looks at when a monument is chosen (model space).
export const MONUMENTS = [
  {
    id: 'encapsulation',
    numeral: 'I',
    name: 'Encapsulation',
    face: 'Washington',
    line: 'The complexity is real. You just don’t have to see it.',
    color: '#F5A623',
    focus: [-10.6, 12.4, 5.2],
  },
  {
    id: 'abstraction',
    numeral: 'II',
    name: 'Abstraction',
    face: 'Jefferson',
    line: 'You don’t need to know how the engine works to drive.',
    color: '#3B78F0',
    focus: [-4.6, 12.4, 1.0],
  },
  {
    id: 'inheritance',
    numeral: 'III',
    name: 'Inheritance',
    face: 'Roosevelt',
    line: 'You don’t start from nothing. You stand on what came before.',
    color: '#5FA352',
    focus: [0.2, 10.8, -1.5],
  },
  {
    id: 'polymorphism',
    numeral: 'IV',
    name: 'Polymorphism',
    face: 'Lincoln',
    line: 'Same name. Different worlds.',
    // Polymorphism has no fixed colour — this is only the starting hue.
    color: '#B44DFF',
    shifting: true,
    focus: [5.7, 9.8, 0.6],
  },
];

// BASE_URL is '/' locally and '/<repo>/' on GitHub Pages.
export const MODEL_URL = `${import.meta.env.BASE_URL}models/rushmore.glb`;
export const CREDIT = {
  text: 'Mount Rushmore scan by matousekfoto',
  license: 'CC BY 4.0',
  url: 'https://sketchfab.com/3d-models/mt-rushmore-b5b2186ba4a44cc9a5351a9fd8b28569',
};
