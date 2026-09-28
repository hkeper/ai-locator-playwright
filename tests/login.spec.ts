import {test, expect} from '@playwright/test';

test('login page opens', async ({page}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Swag Labs');
});

test('login page has username field and login button', async ({page}) => {
  await page.goto('/');
  // await expect(page.getByTestId('username')).toBeVisible();
  await expect(page.locator('[data-test="username"]')).toBeVisible();
  await expect(page.getByTestId('login-button')).toBeVisible();
});
