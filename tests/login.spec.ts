import { test, expect } from '../src/fixtures';

test.describe('login', () => {
  test('login page opens', async ({page, loginPage}) => {
    await expect(page).toHaveTitle('Swag Labs');
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('standard user logs in', async ({page, loginPage}) => {
    await loginPage.login('standard_user', 'secret_sauce');
    await expect(page).toHaveURL('/inventory.html');
  });

  test('locked out user sees an error', async ({loginPage}) => {
    await loginPage.login('locked_out_user', 'secret_sauce');
    await expect(loginPage.errorMessage).toHaveText('Epic sadface: Sorry, this user has been locked out.');
  });

  test('user can\'t login with wrong password', async ({loginPage}) => {
    await loginPage.login('standard_user', 'wrong_password');
    await expect(loginPage.errorMessage).toHaveText('Epic sadface: Username and password do not match any user in this service');
  });

  test('user can\'t login with empty credentials', async ({loginPage}) => {
    await loginPage.login('', '');
    await expect(loginPage.errorMessage).toHaveText('Epic sadface: Username is required');
  });
});
