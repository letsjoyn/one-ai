import { expect, test } from "@playwright/test";

test("register, upload, chat with sources, delete, and invite a teammate", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Work email").fill("engineer@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Document library" })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/handbook.pdf");
    await expect(page.getByText("Upload complete. Indexing has started.")).toBeVisible();
    await expect(page.getByText("handbook.pdf").first()).toBeVisible();
    await expect(page.getByText("Ready")).toBeVisible({ timeout: 10000 });

    await page.getByRole("link", { name: "Chats" }).click();
    await expect(page.getByRole("heading", { name: "Ask your documents" })).toBeVisible();
    await page.getByLabel("Chat message").fill("How many paid vacation days do employees receive?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(/20 paid vacation days/)).toBeVisible();
    await page.getByRole("button", { name: "1 source" }).click();
    await expect(page.getByText(/Full-time employees receive 20 paid vacation days/)).toBeVisible();

    await page.getByRole("link", { name: "Documents" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete handbook.pdf" }).click();
    await expect(page.getByText("handbook.pdf")).toHaveCount(0);

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible();
    await page.getByLabel("Invitee email").fill("teammate@example.com");
    await page.getByLabel("Invitation role").selectOption("member");
    await page.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Invitation sent.")).toBeVisible();
    await expect(page.getByText("teammate@example.com")).toBeVisible();

    await page.getByRole("button", { name: /Switch to dark mode/ }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
});
