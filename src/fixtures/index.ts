import { test as base, expect } from '@playwright/test';
import { AiLocatorHelper } from '../ai/AiLocatorHelper';
import { LoginPage } from '../pages/LoginPage';

type Fixtures = {
    ai: AiLocatorHelper;
    loginPage: LoginPage;
};

export const test = base.extend<Fixtures>({
    ai: async ({ page }, use) => {
        const ai = new AiLocatorHelper(page);
        await use(ai);
    },
    loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await use(loginPage);
    }
});

export { expect };