import { scenes } from '../content/scenes';
import { sectionProgress } from '../lib/sectionProgress';
import { timeline } from '../lib/timeline';
import { layoutScenes } from './layout';
import { createStage } from './stage';

export interface World {
  /** Re-reads section positions and viewport size. Call on resize or reflow. */
  measure(): void;
  /** Renders the frame for the current scroll position. */
  render(): void;
}

export async function mountWorld(canvas: HTMLCanvasElement, sections: readonly HTMLElement[]): Promise<World> {
  if (sections.length !== scenes.length) {
    throw new Error(`Expected ${scenes.length} scene sections, found ${sections.length}`);
  }
  const stage = createStage(canvas, scenes, layoutScenes(scenes));
  await stage.ready;
  const last = scenes.length - 1;
  let centers: number[] = [];

  return {
    measure() {
      centers = sections.map((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top + window.scrollY + rect.height / 2;
      });
      const width = canvas.clientWidth;
      const style = getComputedStyle(document.documentElement);
      const beside = style.getPropertyValue('--world-beside').trim() === '1';
      // Beside the text column, frame the subject in the middle of the free space to its right.
      const x = beside ? (sections[0]!.getBoundingClientRect().right + width) / (2 * width) : 0.5;
      const y = parseFloat(style.getPropertyValue('--world-focus-y')) || 0.5;
      stage.resize(width, canvas.clientHeight, { x, y });
    },

    render() {
      const f = sectionProgress(centers, window.scrollY + window.innerHeight / 2);
      stage.render(timeline(last === 0 ? 0 : f / last, scenes.length));
    },
  };
}
