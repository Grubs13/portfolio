/** Throwaway look prototypes, picked with ?look=pixel|fine|sketch. */
export type Look = 'pixel' | 'fine' | 'sketch' | 'hd';
const param = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('look');
export const LOOK: Look = param === 'fine' || param === 'sketch' || param === 'hd' ? param : 'pixel';
export const LOOK_ID = { pixel: 0, fine: 1, sketch: 2, hd: 3 }[LOOK];
