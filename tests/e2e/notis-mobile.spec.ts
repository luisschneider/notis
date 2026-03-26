import { expect, test } from "@playwright/test";
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
const E2E_PUBLIC_USERNAME = "testuser";

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
}

test.describe("Notis end-to-end flows (mobile 375px)", () => {
  let signupUser: SeededUser | null = null;
  let loginUser: SeededUser | null = null;
  let testUserAccount: SeededUser | null = null;

  test.afterAll(async () => {
    if (signupUser) {
      await removeUserData(signupUser.userId);
      await deleteUserById(signupUser.userId);
    }
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
    signupUser = await createSeededUser({
      usernamePrefix: "mobile_signup",
      displayNamePrefix: "Mobile Signup",
      password: E2E_PASSWORD,
    });

    await signUp(page, {
      email: signupUser.email,
      password: E2E_PASSWORD,
      username: signupUser.username,
      displayName: signupUser.displayName,
    });

    await expect(page).toHaveURL(/\/dashboard\/settings\?welcome=1/);
    await expect(page.getByRole("heading", { name: "Profile settings" }).first()).toBeVisible();
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
      widgetType: "custom_text_bio",
      position: 0,
      config: { title: "About" },
      data: { markdown: "Initial bio" },
      isVisible: true,
    });

    await loginAndGoToWidgets(page, { email: user.email, password: E2E_PASSWORD });

    await page.getByRole("button", { name: "Add widget" }).click();
    await page.getByRole("button", { name: "Add" }).first().click();
    await expect(page.getByText("Widget instances")).toBeVisible();
    await expect(page.getByRole("button", { name: "Hide widget" }).first()).toBeVisible();

    const firstHideButton = page.getByRole("button", { name: "Hide widget" }).first();
    await firstHideButton.click();
    await expect(page.getByRole("button", { name: "Show widget" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Show widget" }).first().click();

    const widgetItems = page.locator("li.rounded-lg.border.bg-card.p-3");
    const firstBefore = await widgetItems.first().innerText();
    const secondBefore = await widgetItems.nth(1).innerText();
    await page.locator('button[aria-label="Drag widget"]').first().dragTo(
      page.locator('button[aria-label="Drag widget"]').nth(1),
    );
    await page.waitForTimeout(500);
    const firstAfter = await widgetItems.first().innerText();
    const secondAfter = await widgetItems.nth(1).innerText();
    expect(firstAfter).toBe(secondBefore);
    expect(secondAfter).toBe(firstBefore);

    await page.getByRole("button", { name: "Delete widget" }).first().click();
    await expect(widgetItems).toHaveCount(1);

    await removeUserData(user.userId);
    await deleteUserById(user.userId);
  });

  test("public board /u/testuser renders visible widgets", async ({ page }) => {
    testUserAccount = await createSeededUser({
      usernamePrefix: "mobile_public",
      displayNamePrefix: "Test User",
      password: E2E_PASSWORD,
    });

    await setProfile({
      userId: testUserAccount.userId,
      username: E2E_PUBLIC_USERNAME,
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

    await page.goto(`/u/${E2E_PUBLIC_USERNAME}`);
    await expect(page.getByText("@testuser")).toBeVisible();
    await expect(page.getByText("Ship fast")).toBeVisible();
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
    await expect(page.getByText("@mobile_settings")).toBeVisible();
    await expect(page.getByText("Updated mobile bio")).toBeVisible();

    await removeUserData(user.userId);
    await deleteUserById(user.userId);
  });
});
