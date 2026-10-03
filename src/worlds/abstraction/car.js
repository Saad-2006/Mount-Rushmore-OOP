// Five layers of the same car, from the showroom to the idea.
// All share one 800×340 viewBox so the wipes line up exactly.

const VB = 'viewBox="0 0 800 340"';
const INK = '#0A0A0A';
const COBALT = '#1A56DB';

// Coupe silhouette, facing right. Wheel centres: rear (190,250), front (600,250).
const BODY =
  'M70,240 L66,206 C66,191 72,183 90,179 L205,163 C245,150 275,118 320,104 ' +
  'C360,92 430,90 470,94 C510,98 545,122 580,150 L690,170 C725,175 742,185 748,200 ' +
  'L752,228 C752,238 746,244 736,245 L656,246 A56,56 0 0 0 544,246 L246,246 ' +
  'A56,56 0 0 0 134,246 L82,246 C74,246 70,244 70,240 Z';
const GLASS =
  'M262,151 C290,129 320,113 355,106 C400,99 450,99 480,104 C510,110 535,128 556,151 Z';
const WHEELS = [190, 600];

function rim(cx, detail) {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const b = a + 0.32;
    const p = (r, ang) => `${(cx + Math.cos(ang) * r).toFixed(1)},${(250 + Math.sin(ang) * r).toFixed(1)}`;
    return `<path d="M${p(8, a - 0.22)} L${p(30, a - 0.08)} L${p(30, b)} L${p(8, b - 0.1)} Z" fill="url(#ab-spoke)"/>`;
  }).join('');
  return `
    <circle cx="${cx}" cy="250" r="46" fill="#0d0d0d"/>
    <circle cx="${cx}" cy="250" r="44" fill="none" stroke="#2b2b2b" stroke-width="2"/>
    <circle cx="${cx}" cy="250" r="32" fill="url(#ab-rim)"/>
    ${detail ? `<path d="M${cx - 20},${232} A27,27 0 0 1 ${cx + 6},${223}" stroke="${COBALT}" stroke-width="7" fill="none" stroke-linecap="round"/>` : ''}
    ${spokes}
    <circle cx="${cx}" cy="250" r="7" fill="#c9c9c9" stroke="#6b6b6b"/>`;
}

export const detailed = `
<svg ${VB} class="ab-layer-svg" aria-label="A detailed car">
  <defs>
    <linearGradient id="ab-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4a4a"/><stop offset="0.35" stop-color="#1c1c1c"/>
      <stop offset="0.7" stop-color="#0b0b0b"/><stop offset="1" stop-color="#1a1a1a"/>
    </linearGradient>
    <linearGradient id="ab-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5d6878"/><stop offset="0.5" stop-color="#1b212b"/><stop offset="1" stop-color="#39424f"/>
    </linearGradient>
    <radialGradient id="ab-rim" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#f2f2f2"/><stop offset="0.6" stop-color="#9a9a9a"/><stop offset="1" stop-color="#4a4a4a"/>
    </radialGradient>
    <linearGradient id="ab-spoke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8e8e8"/><stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
    <filter id="ab-blur"><feGaussianBlur stdDeviation="7"/></filter>
    <clipPath id="ab-body-clip"><path d="${BODY}"/></clipPath>
  </defs>
  <ellipse cx="410" cy="298" rx="350" ry="13" fill="#000" opacity="0.28" filter="url(#ab-blur)"/>
  ${WHEELS.map((x) => `<path d="M${x - 56},246 A56,56 0 0 1 ${x + 56},246 Z" fill="#050505"/>`).join('')}
  <path d="${BODY}" fill="url(#ab-body)"/>
  <g clip-path="url(#ab-body-clip)">
    <path d="M60,214 C250,196 520,192 760,206 L760,222 C520,208 250,212 60,230 Z" fill="#fff" opacity="0.07"/>
    <path d="M60,172 C260,154 520,150 760,172" stroke="#fff" stroke-opacity="0.22" stroke-width="1.5" fill="none"/>
    <rect x="60" y="232" width="700" height="20" fill="#000" opacity="0.35"/>
  </g>
  <path d="${GLASS}" fill="url(#ab-glass)"/>
  <path d="M300,140 C340,118 380,108 420,104 L440,104 C400,112 360,126 330,150 Z" fill="#fff" opacity="0.18"/>
  <rect x="426" y="100" width="9" height="52" fill="${INK}"/>
  <path d="M332,153 L336,242 M546,156 C549,190 549,220 546,242" stroke="#000" stroke-width="1.5" fill="none" opacity="0.8"/>
  <rect x="474" y="170" width="28" height="5" rx="2.5" fill="#9a9a9a"/>
  <path d="M552,140 L572,132 L578,146 L560,150 Z" fill="#111"/>
  <path d="M700,177 C722,181 737,189 743,199 L712,197 Z" fill="#f4f4f4"/>
  <path d="M706,182 L734,190" stroke="${COBALT}" stroke-width="2" stroke-linecap="round"/>
  <path d="M68,192 L94,184 L97,197 L67,203 Z" fill="#2a2a2a" stroke="#555" stroke-width="0.8"/>
  <path d="M700,232 L748,230" stroke="#333" stroke-width="3" stroke-linecap="round"/>
  ${WHEELS.map((x) => rim(x, true)).join('')}
</svg>`;

export const wireframe = `
<svg ${VB} class="ab-layer-svg" aria-label="The car as a wireframe">
  <defs><clipPath id="ab-wire-clip"><path d="${BODY}"/></clipPath></defs>
  <g stroke="${COBALT}" fill="none">
    <g clip-path="url(#ab-wire-clip)" stroke-width="0.6" opacity="0.45">
      ${Array.from({ length: 9 }, (_, i) => `<path d="M40,${100 + i * 18} C300,${90 + i * 18} 520,${90 + i * 18} 780,${104 + i * 18}"/>`).join('')}
      ${Array.from({ length: 19 }, (_, i) => `<path d="M${60 + i * 38},80 C${66 + i * 38},160 ${60 + i * 38},220 ${62 + i * 38},260"/>`).join('')}
    </g>
    <path d="${BODY}" stroke-width="1.6"/>
    <path d="${GLASS}" stroke-width="1.2"/>
    <path d="M430,100 L430,152 M332,153 L336,242 M546,156 C549,190 549,220 546,242" stroke-width="1"/>
    ${WHEELS.map(
      (x) => `
      <circle cx="${x}" cy="250" r="46" stroke-width="1.4"/>
      <circle cx="${x}" cy="250" r="32" stroke-width="0.8"/>
      <circle cx="${x}" cy="250" r="7" stroke-width="0.8"/>
      ${Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return `<line x1="${x + Math.cos(a) * 7}" y1="${250 + Math.sin(a) * 7}" x2="${x + Math.cos(a) * 32}" y2="${250 + Math.sin(a) * 32}" stroke-width="0.8"/>`;
      }).join('')}`
    ).join('')}
    <path d="M110,250 L680,250" stroke-dasharray="4 5" stroke-width="0.7" opacity="0.6"/>
    <g stroke-width="0.8" opacity="0.8">
      <path d="M190,310 L600,310 M190,304 L190,316 M600,304 L600,316"/>
      <path d="M66,328 L752,328 M66,322 L66,334 M752,322 L752,334"/>
      <path d="M40,94 L40,296 M34,94 L46,94 M34,296 L46,296"/>
    </g>
  </g>
  <g font-family="DM Mono, monospace" font-size="10" fill="${COBALT}" letter-spacing="1">
    <text x="395" y="305" text-anchor="middle">WHEELBASE 2 780</text>
    <text x="409" y="323" text-anchor="middle">LENGTH 4 520</text>
    <text x="30" y="200" text-anchor="middle" transform="rotate(-90 30 200)">HEIGHT 1 290</text>
  </g>
</svg>`;

function block(x, y, w, h, label, accent = false) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${accent ? COBALT : '#fff'}" stroke="${accent ? COBALT : INK}" stroke-width="1.4"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" fill="${accent ? '#fff' : INK}">${label}</text>`;
}

export const diagram = `
<svg ${VB} class="ab-layer-svg" aria-label="The car as a block diagram">
  <defs>
    <marker id="ab-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="${INK}"/>
    </marker>
  </defs>
  <g font-family="DM Mono, monospace" font-size="11" letter-spacing="1.5">
    <g stroke="${INK}" stroke-width="1.2" fill="none" marker-end="url(#ab-arrow)">
      <path d="M465,57 L665,57 L665,108"/>
      <path d="M170,74 L170,118"/>
      <path d="M220,142 L598,142"/>
      <path d="M640,174 L640,216 L552,216"/>
      <path d="M420,216 L254,216"/>
      <path d="M196,236 L196,260"/>
      <path d="M520,236 L520,280 L572,280"/>
    </g>
    ${block(335, 40, 130, 34, 'STEERING', true)}
    ${block(120, 40, 100, 34, 'ECU')}
    ${block(110, 120, 110, 44, 'FUEL')}
    ${block(600, 110, 130, 64, 'ENGINE')}
    ${block(420, 196, 130, 40, 'GEARBOX')}
    ${block(140, 196, 112, 40, 'REAR AXLE')}
    ${WHEELS.map((x) => block(x - 26, 262, 52, 36, 'WHEEL')).join('')}
  </g>
</svg>`;

export const steering = `
<svg ${VB} class="ab-layer-svg" aria-label="A steering wheel">
  <g fill="none" stroke="${INK}" stroke-linecap="round">
    <circle cx="400" cy="180" r="92" stroke-width="16"/>
    <circle cx="400" cy="180" r="20" stroke-width="10"/>
    <path d="M308,176 L380,180 M420,180 L492,176 M400,200 L400,270" stroke-width="14"/>
  </g>
  <circle cx="400" cy="180" r="6" fill="${COBALT}"/>
</svg>`;

export const circle = `
<svg ${VB} class="ab-layer-svg" aria-label="A circle">
  <circle cx="400" cy="180" r="92" fill="${COBALT}"/>
</svg>`;
