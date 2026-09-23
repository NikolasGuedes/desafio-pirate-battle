import { expect, test } from '@playwright/test';

test('opens the main menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Options' })).toBeVisible();
});

test('starts and pauses a match without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('canvas[aria-label="Pirate Battle game arena"]')).toBeVisible();
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
