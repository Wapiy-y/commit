import { expect, test } from "@playwright/test";

/**
 * Vehicle flows, driven through the real UI against a stateful mock API.
 *
 * The first test is the regression guard for the bug that shipped in #31: the
 * submit button lived outside its <form> and silently did nothing.
 */

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("VGD 8899")).toBeVisible();
});

test("lists vehicles with derived status, most urgent first", async ({
	page,
}) => {
	const cards = page.locator("main button, div > button").filter({
		has: page.locator("p.font-mono"),
	});
	await expect(cards).toHaveCount(3);

	// The bike's cover lapsed 4 days ago, so it must sort above the insured car
	// and the one with no policy at all.
	await expect(cards.first()).toContainText("WQK 1204");
	await expect(cards.first()).toContainText("Expired 4d ago");
	await expect(page.getByText("No insurance")).toBeVisible();
});

test("adds a vehicle through the modal", async ({ page }) => {
	await page.getByRole("button", { name: "Add vehicle" }).click();
	await expect(
		page.getByRole("heading", { name: "Add vehicle" }),
	).toBeVisible();

	await page.getByLabel("Plate number").fill("JHR 7001");
	await page.getByLabel("Brand").fill("Toyota");
	await page.getByLabel("Model").fill("Vios 1.5 G");
	await page.getByLabel("Odometer (km)").fill("1200");
	await page.getByRole("button", { name: "Save vehicle" }).click();

	// The modal closes and the new card is on the list. Before the fix the click
	// did nothing at all, so this assertion is the whole point of the test.
	await expect(page.getByRole("heading", { name: "Add vehicle" })).toBeHidden();
	await expect(page.getByText("JHR 7001")).toBeVisible();
	await expect(page.getByText("Toyota Vios 1.5 G")).toBeVisible();
});

test("accepts a service interval that is not a round thousand", async ({
	page,
}) => {
	// Regression: the interval field had step="1000", so the browser rejected
	// 1700 with a native "enter a valid value" bubble and the form never
	// submitted — even though the API accepts any positive whole number.
	await page.getByRole("button", { name: "Add vehicle" }).click();
	await page.getByLabel("Plate number").fill("JHR 7002");
	await page.getByLabel("Brand").fill("Modenas");
	await page.getByLabel("Model").fill("Kriss 110");
	await page.getByLabel("Odometer (km)").fill("3400");
	await page.getByLabel("Service every (km)").fill("1700");

	// The hint makes the field's meaning visible: every 1,700 from 3,400.
	await expect(page.getByText("Next service at 5,100 km")).toBeVisible();

	await page.getByRole("button", { name: "Save vehicle" }).click();
	await expect(page.getByText("JHR 7002")).toBeVisible();

	// And the target it computed survives into the detail screen.
	await page.getByText("JHR 7002").click();
	await expect(page.getByText(/every 1,700 km/)).toBeVisible();
});

test("refuses an empty form without closing", async ({ page }) => {
	await page.getByRole("button", { name: "Add vehicle" }).click();
	// Plate/brand/model are required, so the browser blocks submission and the
	// sheet stays open — no request, no silent close.
	await page.getByRole("button", { name: "Save vehicle" }).click();
	await expect(
		page.getByRole("heading", { name: "Add vehicle" }),
	).toBeVisible();
});

test("opens the detail and renews insurance, retiring the old policy", async ({
	page,
}) => {
	await page.getByText("VGD 8899").click();
	await expect(page.getByText("Zurich General Insurance")).toBeVisible();
	await expect(
		page.getByRole("button", { name: /History \(1\)/ }),
	).toBeVisible();

	await page.getByRole("button", { name: "Renew insurance" }).click();
	await page.getByLabel("Provider").fill("Allianz General");
	await page.getByLabel("Policy number").fill("AZ-777-00021");
	await page.getByLabel("Premium (RM)").fill("520.25");
	await page.getByRole("button", { name: "Save policy" }).click();

	await expect(page.getByText("Allianz General")).toBeVisible();
	// The previous policy moved to history rather than being deleted.
	await expect(
		page.getByRole("button", { name: /History \(2\)/ }),
	).toBeVisible();
});

test("logs a service and moves the odometer and next milestone", async ({
	page,
}) => {
	await page.getByText("VGD 8899").click();
	await expect(page.getByText("51,200 km")).toBeVisible();

	await page.getByRole("button", { name: "Log service" }).click();
	await page.getByLabel("Odometer at service (km)").fill("52000");
	await page.getByLabel("Workshop").fill("Perodua Service Centre");
	await page.getByLabel("Cost (RM)").fill("310.40");
	await page.getByRole("button", { name: "Save service" }).click();

	// exact: the service-history row also reads "52,000 km · <date>".
	await expect(page.getByText("52,000 km", { exact: true })).toBeVisible();
	await expect(page.getByText(/Next service at 62,000 km/)).toBeVisible();
});

test("rejects a backwards odometer on the inline mileage form", async ({
	page,
}) => {
	await page.getByText("VGD 8899").click();
	await page.getByPlaceholder("New odometer reading").fill("40000");
	await page.getByRole("button", { name: "Update", exact: true }).click();
	// The API's own message is surfaced rather than a generic failure.
	await expect(
		page.getByText("Mileage cannot be lower than the current reading"),
	).toBeVisible();
	await expect(page.getByText("51,200 km", { exact: true })).toBeVisible();
});

test("edits a vehicle's identity", async ({ page }) => {
	await page.getByText("BKM 4412").click();
	await page.getByRole("button", { name: "Edit vehicle" }).click();
	await page.getByLabel("Plate number").fill("BKM 9999");
	await page.getByRole("button", { name: "Save vehicle" }).click();

	await expect(page.getByText("BKM 9999")).toBeVisible();
});
