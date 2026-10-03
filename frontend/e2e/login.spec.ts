import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";

test.describe("Auth & Onboarding Smoke Test", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test.beforeEach(() => {
    try {
      execSync(
        '../backend/.venv/bin/python ../backend/manage.py shell -c "from django.db import connection; cur = connection.cursor(); cur.execute(\\"DELETE FROM core_idempotencyrecord WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM token_blacklist_blacklistedtoken WHERE token_id IN (SELECT id FROM token_blacklist_outstandingtoken WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\'))\\"); cur.execute(\\"DELETE FROM token_blacklist_outstandingtoken WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM tenancy_membership WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM tenancy_shop WHERE organization_id IN (SELECT id FROM tenancy_organization WHERE owner_user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\'))\\"); cur.execute(\\"DELETE FROM tenancy_organization WHERE owner_user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM accounts_userdevice WHERE user_id IN (SELECT id FROM accounts_user WHERE phone=\'+919999999999\')\\"); cur.execute(\\"DELETE FROM accounts_otpchallenge WHERE phone=\'+919999999999\'\\"); cur.execute(\\"DELETE FROM accounts_user WHERE phone=\'+919999999999\'\\");"'
      );
    } catch {
      // ignore
    }
  });

  test("full flow: phone login -> verify OTP -> profile setup -> onboard shop -> home dashboard & tabs", async ({
    page,
  }) => {
    // 1. Visit Welcome screen
    await page.goto("/welcome/");
    await expect(page).toHaveTitle(/FixPro/);
    await page.waitForLoadState("domcontentloaded");

    // 2. Click "Continue with Phone"
    const continueBtn = page.getByRole("link", { name: /continue with phone/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    await expect(page).toHaveURL(/\/login\/?/);

    // 3. Enter test phone 9999999999 using keypad
    const nineBtn = page.getByRole("button", { name: "9", exact: true });
    await expect(nineBtn).toBeVisible();
    for (let i = 0; i < 10; i++) {
      await nineBtn.click();
    }

    const getOtpBtn = page.getByRole("button", { name: /get otp/i });
    await expect(getOtpBtn).toBeEnabled();
    await getOtpBtn.click();

    // 4. Verify OTP screen
    await expect(page).toHaveURL(/\/verify\/?/);

    // Enter test OTP 123456 into OtpInput
    const firstOtpInput = page.locator('input[type="text"]').first();
    await expect(firstOtpInput).toBeVisible();
    await firstOtpInput.focus();
    await page.keyboard.type("123456");

    // Auto-submit triggers when 6 digits are typed, or verify button can be clicked
    await page.waitForURL(/\/(profile-setup|onboarding|home)\/?/, { timeout: 15000 }).catch(async () => {
      const verifyBtn = page.getByRole("button", { name: /verify otp/i });
      if (await verifyBtn.isEnabled()) {
        await verifyBtn.click();
      }
    });

    await page.waitForURL(/\/(profile-setup|onboarding|home)\/?/, { timeout: 15000 });
    const currentUrl = page.url();

    // 5. Profile Setup step (if user has no name yet)
    if (currentUrl.includes("/profile-setup")) {
      const nameInput = page.locator("#name");
      await expect(nameInput).toBeVisible();
      await nameInput.fill("Ramesh Kumar");
      const continueProfile = page.getByRole("button", { name: /continue/i });
      await continueProfile.click();
      await page.waitForURL(/\/(onboarding|home)\/?/, { timeout: 15000 });
    }

    // 6. Onboarding step (if user has 0 shops)
    if (page.url().includes("/onboarding")) {
      // Step 1: Shop details
      const shopNameInput = page.locator('input[name="name"]');
      await expect(shopNameInput).toBeVisible();
      await shopNameInput.fill("Apex Mobile Clinic");

      const next1 = page.getByRole("button", { name: /next/i });
      await next1.click();

      // Step 2: Contact & Address
      const pincodeInput = page.locator("#pincode");
      await expect(pincodeInput).toBeVisible();
      await pincodeInput.fill("452001");

      const cityInput = page.locator("#city");
      await cityInput.fill("Indore");

      // Select state
      const stateTrigger = page.locator('button[role="combobox"]');
      await expect(stateTrigger).toBeVisible();
      await stateTrigger.click();
      const stateOption = page.getByRole("option", { name: /Madhya Pradesh/i });
      await expect(stateOption).toBeVisible();
      await stateOption.click();

      const next2 = page.getByRole("button", { name: /next/i });
      await next2.click();

      // Step 3: Billing & Taxes
      const createShopBtn = page.getByRole("button", { name: /create my shop/i });
      await expect(createShopBtn).toBeVisible();
      await createShopBtn.click();

      // Step 4: Celebration screen
      const goToHomeBtn = page.getByRole("button", { name: /go to dashboard/i });
      await expect(goToHomeBtn).toBeVisible({ timeout: 15000 });
      await goToHomeBtn.click();
    }

    // 7. Home Dashboard verification
    await expect(page).toHaveURL(/\/home\/?/, { timeout: 15000 });

    // Verify Greeting header
    await expect(
      page.getByRole("heading", { name: /good (morning|afternoon|evening)/i })
    ).toBeVisible();

    // Verify 5 navigation tabs
    const bottomNav = page.locator("nav");
    await expect(bottomNav).toBeVisible();

    const homeTab = bottomNav.getByRole("link", { name: /home/i });
    const jobsTab = bottomNav.getByRole("link", { name: /jobs/i });
    const customersTab = bottomNav.getByRole("link", { name: /customers/i });
    const inventoryTab = bottomNav.getByRole("link", { name: /inventory/i });
    const moreTab = bottomNav.getByRole("link", { name: /more/i });

    await expect(homeTab).toBeVisible();
    await expect(jobsTab).toBeVisible();
    await expect(customersTab).toBeVisible();
    await expect(inventoryTab).toBeVisible();
    await expect(moreTab).toBeVisible();

    // 8. Verify Tab Navigation: Switch to "More" tab
    await moreTab.click();
    await expect(page).toHaveURL(/\/more\/?/);
    await expect(page.getByText(/sales & billing/i)).toBeVisible();
    await expect(page.getByText(/devices & sessions/i)).toBeVisible();

    // Switch back to "Home"
    await homeTab.click();
    await expect(page).toHaveURL(/\/home\/?/);
  });
});
