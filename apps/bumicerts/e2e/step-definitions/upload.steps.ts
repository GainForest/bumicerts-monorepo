/**
 * Manage Dashboard Step Definitions
 *
 * Steps specific to the /manage organization editing flow
 */

import { When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { AppWorld } from "../support/world.js";
import { getPage } from "../support/utils.js";

/**
 * Action: Click the edit button to enter edit mode
 */
When("the user clicks the edit button", async function (this: AppWorld) {
  const page = getPage(this);

  // The Edit button is actually a Link (renders as <a> tag), not a button
  // It has aria-label="Edit organisation profile"
  // There may be multiple (mobile/desktop), so we click the first visible one
  const editButton = page
    .locator('a[aria-label="Edit organisation profile"]')
    .first();
  await editButton.click();

  // Wait for URL to update
  await page.waitForURL(/mode=edit/, { timeout: 5000 });
});

/**
 * Action: Click the cancel button to exit edit mode
 */
When("the user clicks the cancel button", async function (this: AppWorld) {
  const page = getPage(this);

  // Look for Cancel button in the EditBar
  const cancelButton = page.locator('button:has-text("Cancel")').first();
  await cancelButton.click();

  // Wait for URL to change (mode=edit should be removed)
  await page.waitForTimeout(500);
});

/**
 * Action: Click the save button to persist changes
 */
When("the user clicks the save button", async function (this: AppWorld) {
  const page = getPage(this);

  // Look for Save button in the EditBar
  const saveButton = page.locator('button:has-text("Save")').first();
  await saveButton.click();
});

/**
 * Action: Modify the organization description
 */
When(
  "the user modifies the organization description",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Find the long description textarea/editor
    // The EditableAbout component likely has a textarea or contenteditable
    const descriptionField = page
      .locator('textarea, [contenteditable="true"]')
      .first();

    // Clear and type new content
    await descriptionField.click();
    await descriptionField.fill(
      "Updated organization description for E2E testing",
    );
  },
);

/**
 * Assertion: Verify the edit bar is visible
 */
Then("the edit bar should be visible", async function (this: AppWorld) {
  const page = getPage(this);

  // The EditBar shows "You have unsaved changes" message with Save/Cancel buttons
  // There are mobile and desktop versions, so use .first()
  const editBarMessage = page.getByText("You have unsaved changes").first();

  await expect(editBarMessage).toBeVisible({ timeout: 5000 });

  // Also verify both buttons are present
  const saveButton = page.locator('button:has-text("Save")').first();
  const cancelButton = page.locator('button:has-text("Cancel")').first();
  await expect(saveButton).toBeVisible();
  await expect(cancelButton).toBeVisible();
});

/**
 * Assertion: Verify the edit bar is not visible
 */
Then("the edit bar should not be visible", async function (this: AppWorld) {
  const page = getPage(this);

  // The EditBar should be hidden - check for the "unsaved changes" message
  const editBarMessage = page.getByText("You have unsaved changes");

  await expect(editBarMessage).not.toBeVisible();
});

/**
 * Assertion: Verify URL does NOT contain a substring
 */
Then(
  "the page URL should not contain {string}",
  async function (this: AppWorld, urlPart: string) {
    const page = getPage(this);
    const currentUrl = page.url();

    expect(currentUrl).not.toContain(urlPart);
  },
);

/**
 * Assertion: Verify save operation completed successfully
 */
Then(
  "the save operation should complete successfully",
  async function (this: AppWorld) {
    const page = getPage(this);

    // The save operation should:
    // 1. Show a success toast
    // 2. Clear edit mode (setMode(null) on line 316 of ManageDashboardClient)
    // 3. Hide the edit bar

    // Wait for the URL to NOT contain mode=edit (this happens after successful save)
    await page.waitForURL((url) => !url.toString().includes("mode=edit"), {
      timeout: 15000,
    });

    // Also verify the edit bar message is no longer visible
    const editBarMessage = page.getByText("You have unsaved changes");
    await expect(editBarMessage).not.toBeVisible();

    console.log("✅ Save completed successfully - edit mode exited");
  },
);
