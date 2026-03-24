import { type Page, type Locator } from '@playwright/test'

// ─── Types ───────────────────────────────────────────────────
export interface TestUser {
  email: string
  password: string
  nom?: string
  role?: 'user' | 'host'
  companyName?: string
}

// ─── Helpers ─────────────────────────────────────────────────

/** Navigate inside the HashRouter app using the Vite base URL. */
export async function gotoRoute(page: Page, route: string): Promise<void> {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  await page.goto(`/#${normalizedRoute}`)
  await page.waitForLoadState('networkidle')
}

/** Generate a unique test email */
export function generateTestEmail(prefix = 'test'): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${ts}_${rand}@test.scootsafe.com`
}

/** Wait for an element to become visible */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 15000
): Promise<Locator> {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible', timeout })
  return locator
}

/** Wait for an element to be hidden */
export async function waitForHidden(
  page: Page,
  selector: string,
  timeout = 15000
): Promise<void> {
  await page.locator(selector).waitFor({ state: 'hidden', timeout })
}

// ─── Auth Modal Helpers ──────────────────────────────────────

/**
 * Opens the AuthModal by clicking the "Connexion" button in MapView header.
 * Only works when no user is logged in.
 */
export async function openAuthModal(page: Page): Promise<void> {
  // The login button shows "Connexion" text with a UserCircle icon
  const loginBtn = page.locator('button:has-text("Connexion")').first()
  await loginBtn.waitFor({ state: 'visible', timeout: 10000 })
  await loginBtn.click()
  // Wait for the modal glass-card to appear (fixed at bottom)
  await page.locator('.glass-card').first().waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * Switches AuthModal from login mode to register mode.
 * Clicks the "Pas encore de compte ? Créer un compte" link.
 */
export async function switchToRegister(page: Page): Promise<void> {
  const link = page.locator('button:has-text("Pas encore de compte")')
  await link.click()
  // Wait for the "Ton prénom" field to appear (register-only)
  await page.locator('input[placeholder="Ton prénom"]').waitFor({ state: 'visible', timeout: 3000 })
}

/**
 * Switches AuthModal from register mode to login mode.
 */
export async function switchToLogin(page: Page): Promise<void> {
  const link = page.locator('button:has-text("Déjà un compte")')
  await link.click()
}

/**
 * Fills the auth form fields.
 * In register mode, also fills the "nom" (prénom) field.
 */
export async function fillAuthForm(
  page: Page,
  opts: {
    email: string
    password: string
    nom?: string
    isRegister?: boolean
  }
): Promise<void> {
  if (opts.isRegister && opts.nom) {
    await page.locator('input[placeholder="Ton prénom"]').fill(opts.nom)
  }
  await page.locator('input[type="email"]').fill(opts.email)
  await page.locator('input[type="password"]').fill(opts.password)
}

/**
 * Toggles the "Je suis un commerçant" button in register mode.
 */
export async function toggleHostMode(page: Page): Promise<void> {
  const toggleBtn = page.locator('button:has-text("commerçant")')
  await toggleBtn.click()
}

/**
 * Fills the company name field (visible only when host toggle is ON in register mode).
 */
export async function fillCompanyName(page: Page, name: string): Promise<void> {
  const input = page.locator('input[placeholder="Nom de l\'entreprise"]')
  await input.waitFor({ state: 'visible', timeout: 3000 })
  await input.fill(name)
}

/**
 * Clicks the submit button in the auth form.
 * Returns the text of the button for verification.
 */
export async function submitAuthForm(page: Page): Promise<void> {
  const btn = page.locator('button[type="submit"]')
  await btn.click()
}

/**
 * Performs a full login flow: open modal → fill credentials → submit.
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await openAuthModal(page)
  await fillAuthForm(page, { email, password })
  await submitAuthForm(page)
  // Wait for auth to complete — "Déconnexion" button appears
  await page.locator('button:has-text("Déconnexion")').waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Logs out by clicking the "Déconnexion" button.
 */
export async function logout(page: Page): Promise<void> {
  const btn = page.locator('button:has-text("Déconnexion")').first()
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click()
    // Wait for "Connexion" button to reappear
    await page.locator('button:has-text("Connexion")').first().waitFor({ state: 'visible', timeout: 5000 })
  }
}

// ─── RoleSelectModal ─────────────────────────────────────────

/**
 * Selects a role in the post-OAuth RoleSelectModal.
 */
export async function selectRole(
  page: Page,
  role: 'user' | 'host',
  companyName?: string
): Promise<void> {
  const roleBtn = role === 'host'
    ? page.locator('button:has-text("Commerçant")')
    : page.locator('button:has-text("Utilisateur")')

  await roleBtn.click()

  if (role === 'host' && companyName) {
    await page.locator('input[placeholder*="commerce"]').fill(companyName)
  }

  await page.locator('button:has-text("Confirmer")').click()
}

// ─── Booking Helpers ─────────────────────────────────────────

/**
 * Selects a duration in the bottom sheet by clicking one of the duration buttons.
 */
export async function selectDuration(page: Page, label: string): Promise<void> {
  // Duration buttons have text like "1h", "2h", "4h", "Journée (8h)"
  await page.locator(`button:has-text("${label}")`).click()
}
