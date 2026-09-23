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
  await page
    .getByRole('textbox', { name: 'Text 1' })
    .fill('Hello from the updated workflow')
  await page.getByLabel('Upload attachments').setInputFiles({
    name: 'welcome.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.getByRole('img', { name: 'welcome.png' })).toBeVisible()
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
  await page.getByLabel('mon opening time').fill('08:00')
  await page.getByLabel('Timezone').selectOption('Asia/Singapore')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByLabel('mon opening time')).toHaveValue('08:00')
  await expect(page.getByLabel('Timezone')).toHaveValue('Asia/Singapore')
})
