import type { Locator, Page } from '@playwright/test';
import { AiLocatorError } from './types';
import  type { LocatorSpec } from './types';

export interface LocateOptions {
  fallback?: LocatorSpec;
}

export class AiLocatorHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async locate(description: string, options: LocateOptions = {}): Promise<Locator> {
    if (options.fallback !== undefined) {
        return this.toLocator(options.fallback);
    }
    throw new AiLocatorError(description, `AI is not connected yet and no fallback was given for "${description}"`);
  }

  private toLocator(spec: LocatorSpec): Locator {
    switch (spec.strategy) {
      case 'testId':
        return this.page.getByTestId(spec.testId);
      case 'role':
        return this.page.getByRole(spec.role, { name: spec.name, });
      case 'css':
        return this.page.locator(spec.selector);
      case 'text':
        return this.page.getByText(spec.text);
      default: {
        const unreacheble: never = spec;
        return unreacheble;
      }
    }
  }
}