import { expect, test } from '@playwright/test'

test('opens, edits, and closes node details with the keyboard', async ({ page }) => {
  await page.goto('/')

  const welcomeNode = page.getByRole('button', { name: /Welcome Message/i })
  await welcomeNode.focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/nodes\/b0653a$/)
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.getByLabel('Title').fill('Updated welcome')
  await page.getByLabel('Description').fill('A warmer opening message')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Updated welcome' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: /Updated welcome/i })).toBeFocused()
})

test('opens an editable node directly from its route', async ({ page }) => {
  await page.goto('/nodes/d09c08')

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Business Hours')
})
