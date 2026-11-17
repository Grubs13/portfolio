/** Throwaway look prototypes, picked with ?look=pixel|fine|sketch. */
export type Look = 'pixel' | 'fine' | 'sketch';
const param = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('look');
export const LOOK: Look = param === 'fine' || param === 'sketch' ? param : 'pixel';
export const LOOK_ID = { pixel: 0, fine: 1, sketch: 2 }[LOOK];
