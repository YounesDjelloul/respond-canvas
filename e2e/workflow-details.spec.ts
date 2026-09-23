import { expect, test } from '@playwright/test'

test('opens, edits, and closes node details with the keyboard', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Workflow ready')).toBeVisible()
  const welcomeNode = page.getByRole('button', { name: /^Welcome Message\./i })
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
  await expect(
    page.getByRole('button', { name: /^Updated welcome\./i }),
  ).toBeFocused()
})

test('opens an editable node directly from its route', async ({ page }) => {
  await page.goto('/nodes/d09c08')

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Business Hours')
  await page.getByLabel('mon opening time').fill('08:00')
  const timezone = page.getByRole('combobox', { name: 'Timezone' })
  await timezone.click()
  await page
    .getByRole('searchbox', { name: 'Filter timezones' })
    .fill('Asia/Singapore')
  await page.getByRole('option', { name: 'Asia/Singapore', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByLabel('mon opening time')).toHaveValue('08:00')
  await expect(timezone).toHaveText('Asia/Singapore')
})

test('creates a terminal workflow step through insertion mode', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Create New Node' }).click()
  await expect(page.getByText('Choose where to add the new step')).toBeVisible()

  await page
    .getByRole('button', { name: 'Insert a step after Add Comment #1' })
    .click()
  await expect(page.getByRole('dialog', { name: 'Add workflow step' })).toBeVisible()

  await page.getByText('Add comment', { exact: true }).click()
  await page.getByLabel('Title').fill('Escalation note')
  await page.getByLabel('Description').fill('Add context for the support team')
  await page.getByRole('button', { name: 'Create step' }).click()

  await expect(page).toHaveURL(/\/nodes\/step-/)
  const detailsDrawer = page.getByRole('dialog').filter({ hasText: 'Node details' })
  await expect(detailsDrawer).toBeVisible()
  await expect(detailsDrawer.getByLabel('Title')).toHaveValue('Escalation note')
  await expect(
    page.getByRole('button', { name: /^Escalation note\./i }),
  ).toBeVisible()
})
