// What a task is: one atomic UI operation, written in code.
import { Page } from '@playwright/test';
import type { Spot } from '../pages/screens';

export type Input = { required?: boolean; default?: string; description?: string };

export type Task = {
  description: string;
  inputs: Record<string, Input>;
  // Returns values later steps can use, e.g. { name: 'choreo_pg_...' }
  run: (page: Page, input: Record<string, any>) => Promise<Record<string, any> | void>;
  // The screen this task works on. Before run(), the runner goes there by the shortest path from wherever
  // the screen is now (pages/screens.ts). Leave out for tasks that continue a wizard or work anywhere.
  screen?: (input: Record<string, any>) => Spot;
};

export const defineTask = (t: Task) => t;
