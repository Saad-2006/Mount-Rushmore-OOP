import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// One curve and one timing scale for every interface movement on the site —
// menus, buttons, labels, the cursor. Each world's scroll story keeps its own
// signature ease from the brief; everything around it moves like this.
// Same curve as --ease in base.css.
export const EASE = CustomEase.create('rushmore', '.16,1,.3,1');
export const DUR = { xs: 0.25, s: 0.45, m: 0.8, l: 1.2 };
export const STAGGER = 0.08;

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine) and (hover: hover)').matches;

gsap.defaults({ ease: EASE, duration: DUR.m });
