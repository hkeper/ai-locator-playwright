import { test, expect } from '../src/fixtures';
import { AiLocatorError } from '../src/ai/types';

test.describe('ai locator stub', () => {
    test('logs in using fallback locators', async ({ page, ai }) => {
        await page.goto('/');

        const username = await ai.locate('username field', { fallback: { strategy: 'testId', testId: 'username' } });
        const password = await ai.locate('password field', { fallback: { strategy: 'testId', testId: 'password' } });
        const loginButton = await ai.locate('login button', { fallback: { strategy: 'role', role: 'button', name: 'Login' } });  

        await username.fill('standard_user');
        await password.fill('secret_sauce');
        await loginButton.click();

        await expect(page).toHaveURL('/inventory.html');
    });

    test('locate without fallback rejects with AiLocatorError', async ({ ai }) => {
        await expect(ai.locate('anything')).rejects.toThrow(AiLocatorError);
        await expect(ai.locate('anything')).rejects.toThrow('no fallback was given for "anything"');
    });
});


