// The inline head script adds `world` to <html> before first paint when
// motion, data saving and WebGL allow it, so the layout never shifts later.
const root = document.documentElement;
const canvas = document.querySelector<HTMLCanvasElement>('canvas.world-canvas');

const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200);

// Starting the download before the text's LCP would compete with it, so wait for
// the first LCP entry. Browsers without it, and tabs loaded hidden, never report
// one, hence the timeout.
function afterLcp(fn: () => void) {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    observer?.disconnect();
    fn();
  };
  const observer = PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')
    ? new PerformanceObserver(once)
    : undefined;
  observer?.observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(once, observer ? 3000 : 0);
}

async function start(canvas: HTMLCanvasElement) {
  try {
    const { mountWorld } = await import('./mount');
    const sections = [...document.querySelectorAll<HTMLElement>('main > section')];
    const world = await mountWorld(canvas, sections);

    let frame = 0;
    let stale = true;
    const schedule = (remeasure: boolean) => {
      stale ||= remeasure;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        if (stale) world.measure();
        stale = false;
        world.render();
      });
    };

    addEventListener('scroll', () => schedule(false), { passive: true });
    addEventListener('resize', () => schedule(true));
    new ResizeObserver(() => schedule(true)).observe(document.querySelector('main')!);
    root.classList.add('world-ready');
  } catch (error) {
    root.classList.remove('world');
    console.warn('3D world disabled', error);
  }
}

if (canvas && root.classList.contains('world')) {
  const begin = () => afterLcp(() => whenIdle(() => void start(canvas)));
  if (document.readyState === 'complete') begin();
  else addEventListener('load', begin, { once: true });
}
