import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  createSeededUser,
  deleteUserById,
  ensureConnectedAccount,
  ensureWidget,
  removeConnectedAccount,
  removeUserData,
  setProfile,
  type SeededUser,
} from "./helpers/supabase-admin";

const E2E_PASSWORD = "Password123!";

async function signUp(
  page: import("@playwright/test").Page,
  input: {
    email: string;
    password: string;
    username: string;
    displayName: string;
  },
): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByLabel("Username").fill(input.username);
  await expect(page.getByText("Username is available.")).toBeVisible();
  await page.getByLabel("Display name").fill(input.displayName);
  await page.getByRole("button", { name: "Sign up" }).click();
}

async function loginAndGoToWidgets(
  page: import("@playwright/test").Page,
  input: { email: string; password: string },
): Promise<void> {
  await login(page, input);
  await page.goto("/dashboard/widgets");
}

async function login(
  page: import("@playwright/test").Page,
  input: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings/);
}

test.describe("Notis end-to-end flows (mobile 375px)", () => {
  let loginUser: SeededUser | null = null;
  let testUserAccount: SeededUser | null = null;

  test.afterAll(async () => {
    if (loginUser) {
      await removeUserData(loginUser.userId);
      await deleteUserById(loginUser.userId);
    }
    if (testUserAccount) {
      await removeUserData(testUserAccount.userId);
      await deleteUserById(testUserAccount.userId);
    }
  });

  test("full signup flow with username selection", async ({ page }) => {
    const nonce = randomUUID().replace(/-/g, "").slice(0, 10);
    const signupUsername = `mobsignup_${nonce}`.slice(0, 20);

    await signUp(page, {
      email: `mobile-signup-${nonce}@example.com`,
      password: E2E_PASSWORD,
      username: signupUsername,
      displayName: `Mobile Signup ${nonce}`,
    });

    await expect(page).toHaveURL(/\/dashboard\/settings\?welcome=1/);
    await expect(page.getByRole("heading", { name: "Profile settings" }).first()).toBeVisible();
    await page.goto(`/u/${signupUsername}`);
    await expect(page.getByText(`@${signupUsername}`)).toBeVisible();
  });

  test("login flow", async ({ page }) => {
    loginUser = await createSeededUser({
      usernamePrefix: "mobile_login",
      displayNamePrefix: "Mobile Login",
      password: E2E_PASSWORD,
    });

    await login(page, { email: loginUser.email, password: E2E_PASSWORD });
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.getByRole("heading", { name: "Profile settings" }).first()).toBeVisible();
  });

  test("widgets: add, remove, reorder, toggle visibility", async ({ page }) => {
    const user = await createSeededUser({
      usernamePrefix: "mobile_widgets",
      displayNamePrefix: "Mobile Widgets",
      password: E2E_PASSWORD,
    });

    await ensureWidget({
      userId: user.userId,
      widgetType: "custom_text_links",
      position: 0,
      config: { title: "Links" },
      data: { items: [] },
      isVisible: true,
    });
    await ensureWidget({
      userId: user.userId,
      widgetType: "custom_text_quote",
      position: 1,
      config: { title: "Quote" },
      data: { quote: "Initial quote", attribution: "Notis" },
      isVisible: true,
    });

    await loginAndGoToWidgets(page, { email: user.email, password: E2E_PASSWORD });
    const widgetItems = page.locator("li.rounded-lg.border.bg-card.p-3");
    const initialCount = await widgetItems.count();

    await page.getByRole("button", { name: "Add widget" }).click();
    await page.getByRole("button", { name: "Add" }).first().click();
    await expect(page.getByText("Widget instances")).toBeVisible();
    await expect(widgetItems).toHaveCount(initialCount + 1);
    await expect(page.getByRole("button", { name: "Hide widget" }).first()).toBeVisible();

    const firstHideButton = page.getByRole("button", { name: "Hide widget" }).first();
    await firstHideButton.click();
    await expect(page.getByRole("button", { name: "Show widget" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Show widget" }).first().click();

    const widgetTitles = page.locator("li.rounded-lg.border.bg-card.p-3 p.text-sm.font-medium");
    const firstTitleBefore = await widgetTitles
      .first()
      .innerText();
    const secondTitleBefore = await widgetTitles
      .nth(1)
      .innerText();
    let didReorder = false;
    const dragHandles = page.locator('button[aria-label="Drag widget"]');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await dragHandles.first().dragTo(
        dragHandles.nth(1),
        {
          sourcePosition: { x: 8, y: 8 },
          targetPosition: { x: 8, y: 28 },
          force: true,
        },
      );
      await page.waitForTimeout(700);

      const firstTitleAfter = await widgetTitles
        .first()
        .innerText();
      const secondTitleAfter = await widgetTitles
        .nth(1)
        .innerText();
      if (firstTitleAfter === secondTitleBefore && secondTitleAfter === firstTitleBefore) {
        didReorder = true;
        break;
      }
    }
    expect(didReorder).toBe(true);

    await page.getByRole("button", { name: "Delete widget" }).first().click();
    await expect(widgetItems).toHaveCount(initialCount);

    await removeUserData(user.userId);
    await deleteUserById(user.userId);
  });

  test("public board /u/testuser renders visible widgets", async ({ page }) => {
    const publicUsername = `testuser_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    testUserAccount = await createSeededUser({
      usernamePrefix: "mobile_public",
      displayNamePrefix: "Test User",
      password: E2E_PASSWORD,
    });

    await setProfile({
      userId: testUserAccount.userId,
      username: publicUsername,
      displayName: "Test User",
      bio: "Public board bio",
      avatarUrl: null,
    });

    await ensureWidget({
      userId: testUserAccount.userId,
      widgetType: "custom_text_quote",
      position: 0,
      config: { title: "Quote" },
      data: { quote: "Ship fast", attribution: "Notis" },
      isVisible: true,
    });

    await page.goto(`/u/${publicUsername}`);
    await expect(page.getByText(`@${publicUsername}`)).toBeVisible();
    await expect(page.getByText("Ship fast").first()).toBeVisible();
  });

  test("connect mock provider and sync data appears in widget", async ({ page }) => {
    const user = await createSeededUser({
      usernamePrefix: "mobile_provider",
      displayNamePrefix: "Mobile Provider",
      password: E2E_PASSWORD,
    });

    const widget = await ensureWidget({
      userId: user.userId,
      widgetType: "github_recent_activity",
      position: 0,
      config: { title: "GitHub Activity", username: "octocat", maxItems: 3 },
      data: { items: [] },
      isVisible: true,
    });

    await ensureConnectedAccount({
      userId: user.userId,
      provider: "github",
      accessToken: "encrypted-token",
      refreshToken: null,
      expiresAt: null,
      providerUserId: "octocat",
      needsReauth: false,
    });

    await login(page, { email: user.email, password: E2E_PASSWORD });
    await page.goto("/dashboard/connections");
    await expect(page.getByText("Connected as octocat")).toBeVisible();

    await page.goto("/dashboard/widgets");
    await page.goto(`/dashboard/widgets/${widget.id}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByText(/GitHub sync complete/)).toBeVisible();

    await removeConnectedAccount(user.userId, "github");
    await removeUserData(user.userId);
    await deleteUserById(user.userId);
  });

  test("edit profile settings flow", async ({ page }) => {
    const user = await createSeededUser({
      usernamePrefix: "mobile_settings",
      displayNamePrefix: "Mobile Settings",
      password: E2E_PASSWORD,
    });

    await login(page, { email: user.email, password: E2E_PASSWORD });
    await page.goto("/dashboard/settings");

    await page.getByLabel("Display name").fill("Updated Mobile Name");
    await page.getByLabel("Bio").fill("Updated mobile bio");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Profile updated.")).toBeVisible();
    await page.goto(`/u/${user.username}`);
    await expect(page.getByText(`@${user.username}`)).toBeVisible();
    await expect(page.getByText("Updated mobile bio")).toBeVisible();

    await removeUserData(user.userId);
    await deleteUserById(user.userId);
  });
});
