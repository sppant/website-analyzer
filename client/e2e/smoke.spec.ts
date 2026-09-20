import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage loads with the analyzer form", async ({ page }) => {
    await page.goto("/app/");

    await expect(
      page.getByRole("heading", { name: "Free Website SEO Analyzer" }),
    ).toBeVisible();

    await expect(page.getByRole("textbox", { name: "Website URL" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analyze Website" }),
    ).toBeVisible();
  });

  test("main navigation links to auth pages", async ({ page }) => {
    await page.goto("/app/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });

    await nav.getByRole("link", { name: "Log in" }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/app\/login$/);

    await nav.getByRole("link", { name: "Sign up" }).click();
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/app\/signup$/);
  });

  test("running an analysis shows results", async ({ page }) => {
    await page.goto("/app/");

    await page
      .getByRole("textbox", { name: "Website URL" })
      .fill("https://example.com");
    await page.getByRole("button", { name: "Analyze Website" }).click();

    await expect(
      page.getByRole("navigation", { name: "SEO results sections" }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
