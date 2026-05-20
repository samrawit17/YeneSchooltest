import { test, expect } from "@playwright/test";

const baseURL = process.env.SMS_BASE_URL || "http://localhost:3000";

async function submitLogin(page: import("@playwright/test").Page, loginIdentifier: string, password: string) {
  await page.goto(`${baseURL}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/enter your email or username/i).fill(loginIdentifier);
  await page.getByPlaceholder(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in|signing in/i }).click();
}

test("hh11@gmail.com can log in with admin123", async ({ page }) => {
  await submitLogin(page, "hh11@gmail.com", "admin123");
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/admin(?:\/|$)/);
});

test("FI-001 is rejected with admin123", async ({ page }) => {
  await submitLogin(page, "FI-001", "admin123");
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 });
});
