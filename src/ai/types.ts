import type { Page } from '@playwright/test';

/** ARIA-роль в том виде, в каком её принимает page.getByRole. */
export type AriaRole = Parameters<Page['getByRole']>[0];

/** Как найти элемент. Поле strategy — дискриминант. */
export type LocatorSpec =
  | { strategy: 'testId'; testId: string }
  | { strategy: 'role'; role: AriaRole; name?: string }
  | { strategy: 'css'; selector: string }
  | { strategy: 'text'; text: string };

/** Запись кэша: какое описание к какому локатору привело. */
export interface CachedLocator {
  description: string;
  spec: LocatorSpec;
  savedAt: string; // ISO 8601, new Date().toISOString()
}

/** AI-локатор не смог найти элемент по описанию. */
export class AiLocatorError extends Error {
  readonly description: string;

  constructor(description: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AiLocatorError';
    this.description = description;
  }
}

export function describeLocator(spec: LocatorSpec): string {
    switch (spec.strategy) {
        case 'testId':
            return `getByTestId('${spec.testId}')`;
        case 'role':
            if (spec.name !== undefined) {
                return `getByRole('${spec.role}', { name: '${spec.name}' })`;
            }
            return `getByRole('${spec.role}')`;
        case 'css':
            return `locator('${spec.selector}')`;
        case 'text':
            return `getByText('${spec.text}')`;    
        default: {
            const unreachable: never = spec;
            return unreachable;
        } 
    }
}
