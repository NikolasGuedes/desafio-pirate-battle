import { expect, test } from '@playwright/test';

test('opens the main menu with controls for the current device', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Options' })).toBeVisible();
  const mobileControls = page.getByRole('button', { name: 'Controls' });
  const keyboardControls = page.getByRole('heading', { name: 'Keyboard controls' });
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(mobileControls).toBeVisible();
    await expect(keyboardControls).toBeHidden();
  } else {
    await expect(mobileControls).toBeHidden();
    await expect(keyboardControls).toBeVisible();
  }
});

test('requires landscape orientation and uses device-appropriate game controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.getByRole('heading', { name: 'Rotate your device' })).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { name: 'Rotate your device' })).toBeHidden();
  }
  await page.setViewportSize({ width: 800, height: 360 });
  await expect(page.getByRole('heading', { name: 'Rotate your device' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

  await page.getByRole('button', { name: 'Play' }).click();
  const movementControl = page.getByRole('button', { name: 'Turn left' });
  const actionControl = page.getByRole('button', { name: 'Fire starboard broadside' });
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(movementControl).toBeVisible();
    await expect(actionControl).toBeVisible();

    const movementBox = await movementControl.boundingBox();
    const actionBox = await actionControl.boundingBox();
    expect(movementBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(movementBox!.x).toBeLessThan(160);
    expect(actionBox!.x + actionBox!.width).toBeGreaterThan(640);
    expect(movementBox!.width).toBeGreaterThanOrEqual(44);
    expect(actionBox!.width).toBeGreaterThanOrEqual(44);
  } else {
    await expect(movementControl).toBeHidden();
    await expect(actionControl).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Keyboard controls' })).toBeVisible();
  }

  await expect(page.getByText('Loading fleet…')).toBeHidden();
  const arena = page.locator('canvas[aria-label="Pirate Battle game arena"]');
  await expect(arena).toHaveAttribute('data-player-shots', '0');
  await page.keyboard.down('Space');
  await expect(arena).toHaveAttribute('data-aiming', 'fireFront');
  await page.waitForTimeout(150);
  await expect(arena).toHaveAttribute('data-player-shots', '0');
  await page.keyboard.up('Space');
  await expect(arena).toHaveAttribute('data-aiming', '');
  await expect(arena).toHaveAttribute('data-player-shots', '1');
  const broadsideIndicator = page.locator('[data-broadside="starboard"]:visible').first();
  const initialRotation = await broadsideIndicator.getAttribute('style');
  await page.keyboard.down('KeyD');
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator('[data-control="right"]:visible')).toHaveAttribute('data-active', 'true');
  }
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator('[data-control="right"]:visible')).toHaveAttribute('data-active', 'false');
    const portBroadside = page.locator('[data-broadside="port"]:visible');
    await page.keyboard.down('KeyQ');
    await expect(portBroadside).toHaveAttribute('data-active', 'true');
    await expect(arena).toHaveAttribute('data-aiming', 'fireLeft');
    await page.keyboard.up('KeyQ');
    await expect(portBroadside).toHaveAttribute('data-active', 'false');
  }
  const rotatedRotation = await broadsideIndicator.getAttribute('style');
  expect(rotatedRotation).not.toBe(initialRotation);
});

test('explains touch controls on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only navigation');
  await page.goto('/');
  await page.getByRole('button', { name: 'Controls' }).click();
  await expect(page.getByRole('heading', { name: 'Controls' })).toBeVisible();
  await expect(page.getByText('Forward', { exact: true })).toBeVisible();
  await expect(page.getByText('Fire from the ship’s right side.')).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});

test('starts and pauses a match without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  const arena = page.locator('canvas[aria-label="Pirate Battle game arena"]');
  await expect(arena).toBeVisible();
  await expect(arena).toHaveAttribute('data-scenario', /^(emerald-cay|twin-reefs|broken-atoll)$/);
  await expect(page.getByText('Loading fleet…')).toBeHidden();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('heading', { name: 'Game paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('heading', { name: 'Game paused' })).toBeHidden();
  expect(errors).toEqual([]);
});

test('validates and persists game options', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel('Game session time').fill('30');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Enter a whole number from 60 to 180.')).toBeVisible();
  await page.getByLabel('Game session time').fill('120');
  await page.getByLabel('Enemy spawn time').fill('8');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel('Game session time')).toHaveValue('120');
  await expect(page.getByLabel('Enemy spawn time')).toHaveValue('8');
});

test('loads and paginates the mocked ranking', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Anne Bonny' }).first()).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
});

test('finishes, registers and restores a completed match', async ({ page }) => {
  await page.goto('/?testDuration=1');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('heading', { name: 'Time is up!' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Match registered successfully.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Time is up!' })).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('button', { name: 'Match History' }).click();
  await expect(page.getByRole('cell', { name: 'You' })).toBeVisible();
});
