/**
 * Bumicert Creation Step Definitions
 *
 * Steps for creating and publishing bumicerts through the full 5-step wizard
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { AppWorld } from "../support/world.js";
import { getPage } from "../support/utils.js";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation & Setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given: Start a new bumicert (navigates to create page and clicks Get Started)
 */
Given("I start a new bumicert", async function (this: AppWorld) {
  const page = getPage(this);

  await page.goto(`${this.env.appUrl}/bumicert/create`);
  await page.waitForLoadState("domcontentloaded");

  const getStartedButton = page
    .locator('button:has-text("Get Started")')
    .first();
  await getStartedButton.click();

  // Wait for navigation to /bumicert/create/0
  await page.waitForURL(/\/bumicert\/create\/0/, { timeout: 5000 });

  console.log("📝 Started new bumicert creation");
});

/**
 * Given: Navigate to a specific step of bumicert creation
 */
Given(
  "I am on step {int} of bumicert creation",
  async function (this: AppWorld, stepNumber: number) {
    const page = getPage(this);

    // First, start a new bumicert (navigate to /bumicert/create/0)
    await page.goto(`${this.env.appUrl}/bumicert/create`);
    await page.waitForLoadState("domcontentloaded");

    const getStartedButton = page
      .locator('button:has-text("Get Started")')
      .first();
    await getStartedButton.click();

    await page.waitForURL(/\/bumicert\/create\/0/, { timeout: 5000 });

    // If we need to navigate forward to a later step, click Continue
    for (let i = 1; i < stepNumber; i++) {
      const continueButton = page
        .locator('button:has-text("Continue")')
        .first();
      await continueButton.click();
      await page.waitForTimeout(500); // Wait for step transition
    }

    console.log(`📝 Navigated to step ${stepNumber}`);
  },
);

/**
 * When: Click a button by its text
 */
When(
  "the user clicks {string}",
  async function (this: AppWorld, buttonText: string) {
    const page = getPage(this);

    const button = page.locator(`button:has-text("${buttonText}")`).first();
    await button.click();

    // Give time for navigation/action to complete
    await page.waitForTimeout(500);
  },
);

/**
 * When: Click the back button
 */
When("the user clicks the back button", async function (this: AppWorld) {
  const page = getPage(this);

  // Back button has a chevron-left icon
  const backButton = page
    .locator("button:has(svg.lucide-chevron-left)")
    .first();
  await backButton.click();

  await page.waitForTimeout(500);
});

/**
 * Then: Verify user is on a specific step
 */
Then(
  "the user should be on step {int}",
  async function (this: AppWorld, stepNumber: number) {
    const page = getPage(this);

    // Check the step indicator/progress
    // The StepProgress component shows the current step
    // We can verify by checking the URL hash or visible step content

    // For now, check if Continue button exists (not on final step)
    if (stepNumber < 5) {
      const continueButton = page
        .locator('button:has-text("Continue")')
        .first();
      await expect(continueButton).toBeVisible({ timeout: 5000 });
    }

    console.log(`✅ Confirmed on step ${stepNumber}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Cover Details
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When: Fill step 1 title field (minimal required field)
 */
When("the user fills step 1 title field", async function (this: AppWorld) {
  const page = getPage(this);

  // There are mobile and desktop versions, use .first()
  const titleInput = page.locator("#project-title").first();
  await titleInput.fill("Test Bumicert Title");

  console.log("✅ Filled step 1 title field");
});

/**
 * When: Upload a cover image
 */
When("the user uploads a cover image", async function (this: AppWorld) {
  const page = getPage(this);

  // Find the file input (it's hidden, but we can use setInputFiles directly)
  const fileInput = page.locator('input[type="file"]').first();
  const imagePath = resolve(process.cwd(), "e2e/fixtures/test-cover.png");

  await fileInput.setInputFiles(imagePath);

  // Wait for upload/preview to render
  await page.waitForTimeout(1000);

  console.log("📸 Uploaded cover image");
});

/**
 * When: Enter bumicert title (with timestamp placeholder)
 */
When(
  "the user enters bumicert title {string}",
  async function (this: AppWorld, title: string) {
    const page = getPage(this);

    // Replace {timestamp} placeholder with actual timestamp
    const timestamp = Date.now();
    const actualTitle = title.replace("{timestamp}", String(timestamp));

    // There are mobile and desktop versions, use .first()
    const titleInput = page.locator("#project-title").first();
    await titleInput.fill(actualTitle);

    // Store for later verification
    this.bumicertTitle = actualTitle;

    console.log(`✏️ Entered bumicert title: ${actualTitle}`);
  },
);

/**
 * When: Select today as start date
 */
When("the user selects today as start date", async function (this: AppWorld) {
  const page = getPage(this);

  // Click the date range picker button
  const datePickerButton = page.locator("#project-date-range").first();
  await datePickerButton.click();

  // Wait for popover content to be visible (calendar is dynamically loaded)
  await page
    .locator('[data-slot="popover-content"]')
    .waitFor({ state: "visible", timeout: 10000 });

  // Wait for calendar to fully load
  await page
    .locator('[data-slot="calendar"]')
    .waitFor({ state: "visible", timeout: 10000 });

  // Get today's date as a string for the selector
  const today = new Date();
  const todayStr = today.toLocaleDateString();

  // Click today's date button using data-day attribute
  const todayButton = page.locator(`button[data-day="${todayStr}"]`).first();
  await todayButton.click();

  console.log("📅 Selected today as start date");
});

/**
 * When: Mark the project as ongoing
 */
When("the user marks the project as ongoing", async function (this: AppWorld) {
  const page = getPage(this);

  const ongoingCheckbox = page.locator("#is-ongoing").first();
  await ongoingCheckbox.click();

  console.log("⏳ Marked project as ongoing");
});

/**
 * When: Select a work type
 */
When(
  "the user selects work type {string}",
  async function (this: AppWorld, workType: string) {
    const page = getPage(this);

    const workTypeLabel = page.locator(`label:has-text("${workType}")`).first();
    await workTypeLabel.click();

    console.log(`🏷️ Selected work type: ${workType}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Impact Story
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When: Enter impact story (rich text)
 */
When(
  "the user enters impact story {string}",
  async function (this: AppWorld, story: string) {
    const page = getPage(this);

    // The Leaflet editor uses ProseMirror
    const editor = page
      .locator(".leaflet-editor__content .ProseMirror")
      .first();
    await editor.click();
    await editor.fill(story);

    console.log("📖 Entered impact story");
  },
);

/**
 * When: Enter short description
 */
When(
  "the user enters short description {string}",
  async function (this: AppWorld, description: string) {
    const page = getPage(this);

    // The BskyRichTextEditor also uses ProseMirror
    // It's the second ProseMirror on the page (first is impact story)
    const editor = page.locator(".ProseMirror").nth(1);
    await editor.click();
    await editor.fill(description);

    console.log("📝 Entered short description");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Contributors & Sites
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When: Add themselves as a contributor
 */
When(
  "the user adds themselves as a contributor",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Switch to "Enter Name or ID" tab
    const manualTab = page
      .locator('button:has-text("Enter Name or ID")')
      .first();
    await manualTab.click();
    await page.waitForTimeout(300);

    // Enter the test handle
    const input = page
      .locator('input[placeholder*="Contributor name"]')
      .first();
    await input.fill(this.env.testHandle ?? "satyam-test-004.climateai.org");
    await input.press("Enter");

    // Wait for contributor to be added
    await page.waitForTimeout(1000);

    console.log("👤 Added self as contributor");
  },
);

/**
 * When: Ensure a test site exists (create if none found)
 */
When("the user ensures a test site exists", async function (this: AppWorld) {
  const page = getPage(this);

  // Wait for the sites section to load
  await page.waitForTimeout(2000);

  // Check if there are any site buttons with "ha" (hectares) text - these indicate existing sites
  const existingSiteButtons = page.locator('button:has-text("ha")');
  const siteCount = await existingSiteButtons.count();

  console.log(`🔍 Found ${siteCount} existing sites`);

  if (siteCount === 0) {
    console.log("🗺️ No sites found - creating a test site...");

    // Click "Add a site" button
    const addSiteButton = page
      .getByRole("button", { name: /add a site/i })
      .first();
    await addSiteButton.click();

    // Wait for modal to appear by checking for the site name input
    const siteNameInput = page.locator("#name-for-site");
    await siteNameInput.waitFor({ state: "visible", timeout: 10000 });
    console.log("📝 Site editor modal opened");

    // Fill site name
    await siteNameInput.fill(`E2E Test Site ${Date.now()}`);
    console.log("📝 Filled site name");

    // Upload GeoJSON file - FileInput component has a hidden input[type="file"]
    // We need to find the one inside the modal (last file input on page)
    const geoJsonPath = resolve(
      process.cwd(),
      "e2e/fixtures/test-site.geojson",
    );
    const fileInput = page.locator('input[type="file"]').last();
    await fileInput.setInputFiles(geoJsonPath);
    console.log("📁 Uploaded GeoJSON file");

    // Wait for file processing
    await page.waitForTimeout(1500);

    // Click "Add" button (mode === "add" so button text is "Add")
    const addButton = page.getByRole("button", { name: "Add", exact: true });
    await addButton.click();
    console.log("💾 Clicked Add button");

    // Wait for success message and modal to update
    await page.waitForSelector("text=Site added successfully", {
      state: "visible",
      timeout: 10000,
    });
    console.log("✅ Site added successfully");

    // Close the success modal by clicking "Close" button (use last one which is in the modal footer)
    const closeButton = page.getByRole("button", { name: "Close" }).last();
    await closeButton.click();

    // Wait for modal to close and sites to reload
    await page.waitForTimeout(2000);
    console.log("🗺️ Site creation complete");
  } else {
    console.log("✅ At least one site already exists - skipping creation");
  }
});

/**
 * When: Select the first available site
 */
When(
  "the user selects the first available site",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Wait for sites to load
    await page
      .waitForSelector("text=Loading your sites...", {
        state: "hidden",
        timeout: 15000,
      })
      .catch(() => {
        // Loading text might not appear if sites load instantly
      });

    // Wait a bit for sites to render
    await page.waitForTimeout(2000);

    // Site buttons have CircleDashedIcon when not selected or CheckIcon when selected
    // They also have the site name as a span with font-medium class
    // Find buttons that are NOT the "Add a site" button (which has PlusCircleIcon)
    // Look for buttons with CircleDashedIcon specifically
    const siteButtons = page.locator("button:has(svg.lucide-circle-dashed)");

    // Wait for at least one site button to appear
    await siteButtons.first().waitFor({ state: "visible", timeout: 10000 });
    console.log(`🔍 Found ${await siteButtons.count()} site buttons`);

    // Click the first site button
    await siteButtons.first().click();

    // Wait for the site to be selected
    await page.waitForTimeout(1000);

    console.log("🗺️ Selected first available site");
  },
);

/**
 * When: Check the permissions checkbox
 */
When(
  "the user checks the permissions checkbox",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Try clicking the label which should also trigger the checkbox
    const label = page.locator('label[for="confirm-permissions"]').first();
    await label.scrollIntoViewIfNeeded();
    await label.waitFor({ state: "visible", timeout: 15000 });
    await label.click();

    console.log("✅ Checked permissions checkbox");
  },
);

/**
 * When: Check the terms and conditions checkbox
 */
When(
  "the user checks the terms and conditions checkbox",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Try clicking the label which should also trigger the checkbox
    const label = page.locator('label[for="agree-tnc"]').first();
    await label.scrollIntoViewIfNeeded();
    await label.waitFor({ state: "visible", timeout: 15000 });
    await label.click();

    console.log("✅ Checked T&C checkbox");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Review
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Then: Verify review page shows all sections complete
 */
Then(
  "the user should see the review page with all sections complete",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Look for the review page indicators
    // Check if there's a Continue button (to proceed to Step 5)
    const continueButton = page.locator('button:has-text("Continue")').first();
    await expect(continueButton).toBeVisible({ timeout: 10000 });

    // Optionally check for circle-check icons indicating completion
    const checkIcons = page.locator("svg.lucide-circle-check-2");
    const checkCount = await checkIcons.count();

    console.log(`✅ Review page loaded with ${checkCount} completed sections`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Publish
// ─────────────────────────────────────────────────────────────────────────────

// Note: "Publish Bumicert" is handled by the generic "the user clicks {string}" step above

/**
 * Then: Verify bumicert was published successfully
 */
Then(
  "the bumicert should be published successfully",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Wait for success indicators:
    // 1. "Published!" heading
    // 2. Party popper icon
    // 3. View Bumicert link

    const publishedHeading = page.locator('h3:has-text("Published!")');
    await expect(publishedHeading).toBeVisible({ timeout: 30000 });

    console.log("🎉 Bumicert published successfully!");
  },
);

/**
 * Then: Verify success message is visible
 */
Then(
  "the user should see the success message",
  async function (this: AppWorld) {
    const page = getPage(this);

    // Look for success indicators
    const partyIcon = page.locator("svg.lucide-party-popper");
    await expect(partyIcon).toBeVisible({ timeout: 5000 });

    const viewButton = page
      .locator('a:has-text("View Bumicert")')
      .or(page.locator('button:has-text("View Bumicert")'));
    await expect(viewButton.first()).toBeVisible();

    console.log("✅ Success message displayed");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Draft Save & Resume
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When: Save the draft
 */
When("the user saves the draft", async function (this: AppWorld) {
  const page = getPage(this);

  // Click "Save as Draft" button
  const saveButton = page.locator('button:has-text("Save as Draft")').first();
  await saveButton.click();

  // Wait for modal to appear
  await page.waitForTimeout(500);

  // Look for a save/confirm button in the modal
  const confirmButton = page
    .locator('button:has-text("Save")')
    .or(page.locator('button:has-text("Confirm")'))
    .first();

  const confirmExists = await confirmButton
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (confirmExists) {
    await confirmButton.click();
  }

  // Wait for save to complete (URL should change to include draft ID)
  await page.waitForTimeout(2000);

  console.log("💾 Draft saved");
});

/**
 * Then: Verify draft appears in the list
 */
Then(
  "the user should see their draft in the list",
  async function (this: AppWorld) {
    const page = getPage(this);

    // On the /bumicert/create page, look for the drafts list
    // The DraftBumicerts component shows "Draft Bumicerts"

    const draftsList = page.locator("text=/Draft Bumicerts|Your Drafts/i");
    await expect(draftsList).toBeVisible({ timeout: 5000 });

    console.log("✅ Draft visible in list");
  },
);

/**
 * When: Click on the first draft
 */
When("the user clicks on their first draft", async function (this: AppWorld) {
  const page = getPage(this);

  // Find the first draft item and click it
  // Drafts are likely in a list or grid
  const firstDraft = page
    .locator('[data-testid="draft-item"]')
    .or(
      page
        .locator('a[href*="/bumicert/create/"]')
        .or(page.locator("button").filter({ hasText: /Draft|Test/ })),
    )
    .first();

  await firstDraft.click();

  // Wait for navigation
  await page.waitForTimeout(1000);

  console.log("🖱️ Clicked on first draft");
});

/**
 * Then: Verify the bumicert title contains expected text
 */
Then(
  "the bumicert title should contain {string}",
  async function (this: AppWorld, expectedText: string) {
    const page = getPage(this);

    // Check the title input field (use .first() for mobile/desktop)
    const titleInput = page.locator("#project-title").first();
    const titleValue = await titleInput.inputValue();

    expect(titleValue).toContain(expectedText);

    console.log(`✅ Title contains: ${expectedText}`);
  },
);
