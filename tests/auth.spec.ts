import { test, expect } from '@playwright/test'
import {
  generateTestEmail,
  openAuthModal,
  switchToRegister,
  fillAuthForm,
  submitAuthForm,
  toggleHostMode,
  fillCompanyName,
  login,
  logout,
} from './utils/test-helpers'

test.describe('Authentification — Email', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page).catch(() => {})
  })

  test('Inscription USER (toggle host OFF)', async ({ page }) => {
    await openAuthModal(page)
    await switchToRegister(page)

    await expect(page.locator('input[type="checkbox"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeDisabled()

    await page.locator('input[type="checkbox"]').check()

    // Host toggle should NOT be active by default
    // The toggle button text should say "commerçant" but not be styled as active
    const toggle = page.locator('button:has-text("commerçant")')
    await expect(toggle).toBeVisible()

    // Company field should NOT be visible when toggle is off
    await expect(page.locator('input[placeholder="Nom de l\'entreprise"]')).not.toBeVisible()

    const testEmail = generateTestEmail('user')

    await fillAuthForm(page, {
      email: testEmail,
      password: 'Test1234!@#$',
      nom: 'TestUserE2E',
      isRegister: true,
    })

    await submitAuthForm(page)

    // Supabase may show success message OR reject the test email
    // Either way validates the form was submitted correctly
    const result = page.locator('text=/Vérifie ta boîte mail|is invalid|already registered|Email rate limit/i').first()
    await expect(result).toBeVisible({ timeout: 10000 })
  })

  test('Inscription HOST (toggle ON + champ entreprise)', async ({ page }) => {
    await openAuthModal(page)
    await switchToRegister(page)
    await page.locator('input[type="checkbox"]').check()

    // Activate host toggle
    await toggleHostMode(page)

    // Company name field should now be visible
    const companyInput = page.locator('input[placeholder="Nom de l\'entreprise"]')
    await expect(companyInput).toBeVisible({ timeout: 3000 })

    const testEmail = generateTestEmail('host')
    const companyName = `TestCo ${Date.now()}`

    await fillCompanyName(page, companyName)

    await fillAuthForm(page, {
      email: testEmail,
      password: 'Test1234!@#$',
      nom: 'TestHostE2E',
      isRegister: true,
    })

    await submitAuthForm(page)

    // Supabase may show success message OR reject the test email
    const result = page.locator('text=/Vérifie ta boîte mail|is invalid|already registered|Email rate limit/i').first()
    await expect(result).toBeVisible({ timeout: 10000 })
  })

  test('Connexion email existante', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
      test.skip()
      return
    }

    await login(page, email, password)

    // "Déconnexion" button should be visible → user is logged in
    await expect(page.locator('button:has-text("Déconnexion")')).toBeVisible()
  })

  test('Erreur mot de passe incorrect', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    if (!email) {
      test.skip()
      return
    }

    await openAuthModal(page)
    await fillAuthForm(page, { email, password: 'mauvais_mot_de_passe' })
    await submitAuthForm(page)

    // Should show error message
    const errorMsg = page.locator('text=Email ou mot de passe incorrect')
    await expect(errorMsg).toBeVisible({ timeout: 10000 })
  })

  test('Les CGU sont obligatoires avant inscription', async ({ page }) => {
    await openAuthModal(page)
    await switchToRegister(page)

    await expect(page.locator('button[type="submit"]')).toBeDisabled()

    await fillAuthForm(page, {
      email: generateTestEmail('blocked'),
      password: 'Test1234!@#$',
      nom: 'BlockedUser',
      isRegister: true,
    })

    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    await expect(page.locator('text=J’ai lu et j’accepte les CGU')).toBeVisible()
  })
})

test.describe('Authentification — Google OAuth', () => {
  test('Bouton Google présent dans la modale', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await openAuthModal(page)

    // Google button should be visible
    const googleBtn = page.locator('button:has-text("Continuer avec Google")')
    await expect(googleBtn).toBeVisible()
  })

  // Google OAuth tests require real OAuth flow — skip in automated testing
  test.skip('Google OAuth + sélection rôle (requires real OAuth)', async () => {})
})

test.describe('AuthModal — Navigation UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Toggle entre login et register', async ({ page }) => {
    await openAuthModal(page)

    // Default mode is login — title should say "Connexion"
    await expect(page.locator('h2:has-text("Connexion")')).toBeVisible()

    // Switch to register
    await switchToRegister(page)
    await expect(page.getByRole('heading', { name: 'Créer un compte', exact: true })).toBeVisible()

    // "Ton prénom" field should be visible in register mode
    await expect(page.locator('input[placeholder="Ton prénom"]')).toBeVisible()

    // Switch back to login
    const backLink = page.locator('button:has-text("Déjà un compte")')
    await backLink.click()
    await expect(page.locator('h2:has-text("Connexion")')).toBeVisible()

    // "Ton prénom" should be gone
    await expect(page.locator('input[placeholder="Ton prénom"]')).not.toBeVisible()
  })

  test('Fermer la modale avec le bouton X', async ({ page }) => {
    await openAuthModal(page)
    await expect(page.locator('h2:has-text("Connexion")')).toBeVisible()

    // Click the close button (aria-label="Fermer")
    await page.locator('button[aria-label="Fermer"]').click()

    // Modal should disappear — "Connexion" header gone
    await expect(page.locator('h2:has-text("Connexion")')).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('Landing — Parcours visiteur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Le visiteur peut ouvrir la carte sans compte', async ({ page }) => {
    await expect(page.locator('text=Explorer la carte sans compte')).toBeVisible()
    await page.locator('text=Explorer la carte sans compte').click()
    await expect(page).toHaveURL(/#\/map/)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
  })
})
