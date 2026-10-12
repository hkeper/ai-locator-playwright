import { test, expect } from '@playwright/test';
import { AiLocatorError, describeLocator, LocatorSpec } from '../../src/ai/types';

test('AiLocatorError keeps description, name and cause', () => {
  const root = new Error('Timeout 5000ms exceeded');
  const err = new AiLocatorError('login button', 'Element not found', { cause: root });

  expect(err).toBeInstanceOf(AiLocatorError);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe('AiLocatorError');
  expect(err.description).toBe('login button');
  expect(err.cause).toBe(root);
});

test('describeLocator method test for testId strategy', () => {
  const spec: LocatorSpec = { strategy: 'testId', testId: 'username' };
  const description = describeLocator(spec);
  expect(description).toBe("getByTestId('username')");
});

test('describeLocator method test for role strategy with name', () => {
  const spec: LocatorSpec = { strategy: 'role', role: 'button', name: 'Login' };
  const description = describeLocator(spec);
  expect(description).toBe("getByRole('button', { name: 'Login' })");
});

test('describeLocator method test for role strategy without name', () => {
  const spec: LocatorSpec = { strategy: 'role', role: 'button'};
  const description = describeLocator(spec);
  expect(description).toBe("getByRole('button')");
});

test('describeLocator method test for css strategy', () => {
  const spec: LocatorSpec = { strategy: 'css', selector: '#password' };
  const description = describeLocator(spec);
  expect(description).toBe("locator('#password')");
});

test('describeLocator method test for text strategy', () => {
  const spec: LocatorSpec = { strategy: 'text', text: 'Accepted usernames are:' };
  const description = describeLocator(spec);
  expect(description).toBe("getByText('Accepted usernames are:')");
});
