import { expect, test } from '@playwright/test';

const integrationRun = process.env.PLAYWRIGHT_INTEGRATION === 'true';

test.describe('passkeys', () => {
  test.skip(!integrationRun, 'Passkey ceremonies require the Laravel integration stack.');

  test('a user can register and use a passkey to sign in', async ({ context, page }) => {
    const client = await context.newCDPSession(page);
    await client.send('WebAuthn.enable');
    const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    try {
      await page.goto('/login');
      await expect(page.evaluate(() => ({
        isSecureContext: window.isSecureContext,
        publicKeyCredential: typeof window.PublicKeyCredential,
      }))).resolves.toEqual({ isSecureContext: true, publicKeyCredential: 'function' });
      await page.getByLabel('Email').fill('admin@example.test');
      await page.getByRole('textbox', { name: 'Password' }).fill('ChangeMe!123456');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto('/security');
      await page.getByLabel('Passkey name').fill('Chromium virtual authenticator');
      await page.getByRole('button', { name: 'Add passkey' }).click();
      await expect(page.getByText('Passkey registered successfully.')).toBeVisible();

      await context.clearCookies();
      await page.goto('/login');
      await page.getByRole('button', { name: 'Sign in with passkey' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    }
  });
});
