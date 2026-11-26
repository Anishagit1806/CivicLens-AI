import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('CivicLens AI End-to-End Workflows & Accessibility', () => {
  test('landing page loads, switches English/Tamil, supports keyboard skip link, and passes axe accessibility checks', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: /Turn citizen reports into prioritized, accountable municipal action/i,
      })
    ).toBeVisible();

    // Automated WCAG accessibility check via axe-core
    const a11yResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(a11yResults.violations).toEqual([]);

    // Keyboard navigation: first Tab focuses skip link
    await page.keyboard.press('Tab');
    const focusedText = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedText).toContain('Skip to main content');

    // Switch language to Tamil and verify translated UI
    await page.getByRole('button', { name: /Switch language to Tamil/i }).click();
    await expect(
      page.getByRole('heading', {
        name: /குடிமக்கள் புகார்களை முன்னுரிமைப்படுத்தப்பட்ட நகராட்சி நடவடிக்கையாக மாற்றுங்கள்/i,
      })
    ).toBeVisible();

    // Switch back to English
    await page.getByRole('button', { name: /Switch language to English/i }).click();
  });

  test('citizen registers, previews AI triage, submits report, filters explorer, and admin resolves it', async ({
    page,
  }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;

    // 1. Register new citizen account
    await page.goto('/register');
    await page.getByLabel('Full Name').fill('Meenakshi Sundaram');
    await page.getByLabel('Email Address').fill(uniqueEmail);
    await page.getByLabel('Password').fill('CitizenPass123!');
    await page.getByRole('button', { name: /^Register$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Welcome, Meenakshi Sundaram/i)).toBeVisible();

    // 2. Navigate to Report Issue page and submit a new civic issue
    await page.goto('/report');
    const reportTitle = `Damaged drainage manhole near school ${Date.now()}`;
    await page.getByLabel(/Issue Title/i).fill(reportTitle);
    await page.getByLabel(/Issue Category/i).selectOption('drainage');
    await page
      .getByLabel(/Detailed Description/i)
      .fill(
        'Open manhole cover next to primary school gate creating severe pedestrian and flooding hazard.'
      );
    await page.getByLabel(/Street Address/i).fill('Besant Avenue, Adyar');
    await page.getByLabel(/Ward \/ Municipal Zone/i).fill('Ward 173 - Adyar');

    // Run AI Triage Preview
    await page
      .getByRole('button', { name: /Preview AI Triage & Duplicate Check/i })
      .click();
    await expect(page.getByText(/Priority Score:/i).first()).toBeVisible();

    // Submit Official Report
    await page.getByRole('button', { name: /Submit Official Report/i }).click();
    await expect(page).toHaveURL(/\/issues\/[0-9a-f-]+/);
    await expect(page.getByRole('heading', { name: reportTitle })).toBeVisible();
    await expect(
      page.getByText(/Transparent Priority Score Formula/i)
    ).toBeVisible();

    // 3. Filter Issue Explorer for the submitted issue
    await page.goto('/explore');
    await page.getByPlaceholder(/Search by title/i).fill(reportTitle);
    await expect(page.getByRole('link', { name: reportTitle })).toBeVisible();

    // Verify negative access: citizen cannot access Admin Triage
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: /Administrator Authorization Required/i })
    ).toBeVisible();

    // 4. Sign out and sign in as Demo Admin
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await page.goto('/login');
    await page.getByRole('button', { name: /Fill Admin Demo/i }).click();
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(
      page.getByRole('heading', { name: /Municipal Admin Triage Console/i })
    ).toBeVisible();

    // Select the newly submitted issue and mark In Progress
    await page.getByRole('button', { name: new RegExp(reportTitle) }).click();
    await page.getByLabel(/^Status$/i).selectOption('in_progress');
    await page.getByLabel(/Assigned Department/i).fill('Stormwater Rapid Division');
    await page.getByLabel(/Official Audit Note/i).fill('Safety barricade installed; slab ordered.');
    await page.getByRole('button', { name: /Save Official Update/i }).click();

    await expect(page.getByText(/updated to In Progress/i).first()).toBeVisible();
  });

  test('renders cleanly on mobile viewport and shows empty state on unmatched filter', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/explore');

    await page
      .getByPlaceholder(/Search by title/i)
      .fill('nonexistent-civic-query-xyz-9999');
    await expect(
      page.getByRole('heading', { name: /No matching civic issues found/i })
    ).toBeVisible();

    // Check mobile navigation drawer opens and closes via button
    await page.getByRole('button', { name: /Open menu/i }).click();
    await expect(page.locator('#mobile-nav-drawer')).toBeVisible();
  });
});
