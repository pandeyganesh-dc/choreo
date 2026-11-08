// What a task is: one atomic UI operation, written in code.
import { Page } from '@playwright/test';

export type Input = { required?: boolean; default?: string; description?: string };

export type Task = {
  description: string;
  inputs: Record<string, Input>;
  // Returns values later steps can use, e.g. { name: 'choreo_pg_...' }
  run: (page: Page, input: Record<string, any>) => Promise<Record<string, any> | void>;
};

export const defineTask = (t: Task) => t;
