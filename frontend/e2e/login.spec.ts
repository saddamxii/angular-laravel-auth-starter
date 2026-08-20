import { expect, test } from '@playwright/test';

test('login screen is responsive and accessible', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with passkey' })).toBeVisible();
});
