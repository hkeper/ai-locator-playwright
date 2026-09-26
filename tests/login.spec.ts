import {test, expect} from '@playwright/test';

test('login page opens', async ({page}) => {
  await page.goto('https://www.saucedemo.com/');
  await expect(page).toHaveTitle('Swag Labs');
});

test('login page has username field and login button', async ({page}) => {
  await page.goto('https://www.saucedemo.com/');
  await expect(page.getByPlaceholder('Username')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});
