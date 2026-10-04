import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { execSync } from "node:child_process";

test.describe("Accessibility Audits (Axe WCAG AA)", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test.beforeAll(() => {
    try {
      execSync(
        '../backend/.venv/bin/python ../backend/manage.py shell -c "from django.db import connection; cur = connection.cursor(); cur.execute(\\"DELETE FROM core_idempotencyrecord WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM token_blacklist_blacklistedtoken WHERE token_id IN (SELECT id FROM token_blacklist_outstandingtoken WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\'))\\"); cur.execute(\\"DELETE FROM token_blacklist_outstandingtoken WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM accounts_otpchallenge WHERE phone=\'+919999999999\'\\");"'
      );
    } catch {
      // ignore
    }
  });

  test("welcome page has no serious/critical a11y violations", async ({ page }) => {
    await page.goto("/welcome/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: /continue with phone/i })).toBeVisible({ timeout: 30000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const criticalViolations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("login page has no serious/critical a11y violations", async ({ page }) => {
    await page.goto("/login/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /get otp/i })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const criticalViolations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("authenticated flow: home, jobs list, job detail, and intake step 1", async ({ page }) => {
    // 1. Log in to establish authenticated session
    await page.goto("/login/");
    const nineBtn = page.getByRole("button", { name: "9", exact: true });
    await expect(nineBtn).toBeVisible();
    for (let i = 0; i < 10; i++) {
      await nineBtn.click();
    }
    await page.getByRole("button", { name: /get otp/i }).click();

    await page.waitForURL(/\/verify\/?/);
    const firstOtpInput = page.locator('input[type="text"]').first();
    await expect(firstOtpInput).toBeVisible();
    await firstOtpInput.focus();
    await page.keyboard.type("123456");

    await page.waitForURL(/\/(profile-setup|onboarding|home)\/?/, { timeout: 15000 });
    let currentUrl = page.url();

    if (currentUrl.includes("/profile-setup")) {
      const nameInput = page.locator("#name");
      await expect(nameInput).toBeVisible();
      await nameInput.fill("Ramesh Kumar");
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/(onboarding|home)\/?/, { timeout: 15000 });
      currentUrl = page.url();
    }

    if (currentUrl.includes("/onboarding")) {
      const shopNameInput = page.locator('input[name="name"]');
      await expect(shopNameInput).toBeVisible();
      await shopNameInput.fill("Apex Mobile Clinic");
      await page.getByRole("button", { name: /next/i }).click();

      const pincodeInput = page.locator("#pincode");
      await expect(pincodeInput).toBeVisible();
      await pincodeInput.fill("452001");
      await page.locator("#city").fill("Indore");

      const stateTrigger = page.locator('button[role="combobox"]');
      await stateTrigger.click();
      await page.getByRole("option", { name: /Madhya Pradesh/i }).click();
      await page.getByRole("button", { name: /next/i }).click();

      await page.getByRole("button", { name: /create my shop/i }).click();
      const goToHomeBtn = page.getByRole("button", { name: /go to dashboard/i });
      await expect(goToHomeBtn).toBeVisible({ timeout: 15000 });
      await goToHomeBtn.click();
      await page.waitForURL(/\/home\/?/, { timeout: 15000 });
    }

    // 2. Scan Home Page
    await expect(page).toHaveURL(/\/home\/?/);
    await page.waitForLoadState("networkidle");
    const homeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const homeViolations = homeResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(homeViolations).toEqual([]);

    // 3. Scan Jobs List Page
    await page.goto("/jobs/");
    await page.waitForLoadState("networkidle");
    const jobsResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const jobsViolations = jobsResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(jobsViolations).toEqual([]);

    // 4. Scan Intake Step 1 Page
    await page.goto("/jobs/new/");
    await page.waitForLoadState("networkidle");
    const intakeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const intakeViolations = intakeResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(intakeViolations).toEqual([]);

    // 5. Scan Job Detail Page (with empty/mock id)
    await page.goto("/jobs/detail/?id=00000000-0000-0000-0000-000000000000");
    await page.waitForLoadState("networkidle");
    const detailResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const detailViolations = detailResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(detailViolations).toEqual([]);
  });
});
