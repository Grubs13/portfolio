import { scenes } from '../content/scenes';
import { sectionProgress } from '../lib/sectionProgress';
import { timeline } from '../lib/timeline';
import { characterFor } from './art/model';
import { loadSceneStages } from './art/sceneModel';
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
  const [character, loaded] = await Promise.all([characterFor(), loadSceneStages(scenes)]);
  const stage = createStage(canvas, scenes, layoutScenes(scenes), character, loaded);
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
      const y = parseFloat(style.getPropertyValue('--world-focus-y')) || 0.5;
      // Beside the text column, frame each scene's subject in the middle of the free space on the other side of its panel.
      const focuses = sections.map((section) => {
        if (!beside) return { x: 0.5, y };
        const panel = section.querySelector('.panel')!.getBoundingClientRect();
        const left = panel.left + panel.width / 2 < width / 2;
        return { x: left ? (panel.right + width) / (2 * width) : panel.left / (2 * width), y };
      });
      stage.resize(width, canvas.clientHeight, focuses);
    },

    render() {
      const f = sectionProgress(centers, window.scrollY + window.innerHeight / 2);
      stage.render(timeline(last === 0 ? 0 : f / last, scenes.length));
    },
  };
}
