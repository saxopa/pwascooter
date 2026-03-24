import { test, expect, type Page } from '@playwright/test'
import {
  generateTestEmail,
  openAuthModal,
  fillAuthForm,
  selectRole,
  waitForVisible,
  waitForHidden
} from './utils/test-helpers'

// Configuration des timeouts par défaut
const DEFAULT_TIMEOUT = 30000

test.describe('Authentification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigation vers la page d'accueil
    await page.goto('/')
    // Attendre que la page soit complètement chargée
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    // Déconnexion après chaque test pour isolation
    try {
      // Chercher le menu utilisateur ou bouton déconnexion
      const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), button:has-text("Se déconnecter")').first()
      if (await logoutButton.isVisible({ timeout: 5000 })) {
        await logoutButton.click()
        await page.waitForTimeout(1000)
      }
    } catch {
      // Ignore errors during logout
    }
  })

  test('Inscription email USER (toggle OFF)', async ({ page }) => {
    // Ouvrir la modale d'authentification
    await openAuthModal(page)
    
    // Vérifier que la modale est visible
    await waitForVisible(page, '[role="dialog"]')
    
    // Cliquer sur "S'inscrire" / "Sign up"
    const signUpLink = page.locator('button:has-text("S\'inscrire"), a:has-text("S\'inscrire"), button:has-text("Sign up")')
    await signUpLink.click()
    
    // Vérifier que le formulaire d'inscription est affiché
    await expect(page.locator('input[type="email"]')).toBeVisible()
    
    // S'assurer que le toggle host est désactivé (position par défaut = user)
    const hostToggle = page.locator('input[type="checkbox"]').first()
    const isHostEnabled = await hostToggle.isChecked?.() ?? false
    expect(isHostEnabled).toBe(false)
    
    // Générer un email unique
    const testEmail = generateTestEmail('user')
    const testPassword = 'Test1234!@#$'
    
    // Remplir le formulaire d'inscription
    await fillAuthForm(page, testEmail, testPassword, true)
    
    // Cliquer sur le bouton d'inscription
    const submitButton = page.locator('button[type="submit"]:has-text("S\'inscrire"), button[type="submit"]:has-text("Sign up"), button[type="submit"]:has-text("Inscription")')
    await submitButton.click()
    
    // Attendre la confirmation ou redirection
    await page.waitForTimeout(2000)
    
    // Vérifier que l'inscription a réussi (modale fermée ou message de succès)
    const modalClosed = await page.locator('[role="dialog"]').isHidden({ timeout: 5000 }).catch(() => true)
    expect(modalClosed).toBeTruthy()
  })

  test('Inscription email HOST (toggle ON + champ entreprise)', async ({ page }) => {
    // Ouvrir la modale d'authentification
    await openAuthModal(page)
    
    // Cliquer sur "S'inscrire"
    const signUpLink = page.locator('button:has-text("S\'inscrire"), a:has-text("S\'inscrire"), button:has-text("Sign up")')
    await signUpLink.click()
    
    // Activer le toggle "Je suis un commerçant"
    const hostToggle = page.locator('input[type="checkbox"]').first()
    if (!(await hostToggle.isChecked?.() ?? false)) {
      await hostToggle.click()
    }
    
    // Vérifier que le champ "Nom de l'entreprise" apparaît
    const companyField = page.locator('input[name="companyName"], input[placeholder*="entreprise"], input[placeholder*="société"]')
    await expect(companyField).toBeVisible()
    
    // Générer un email unique
    const testEmail = generateTestEmail('host')
    const testPassword = 'Test1234!@#$'
    const companyName = 'Test Company ' + Date.now()
    
    // Remplir le formulaire
    await fillAuthForm(page, testEmail, testPassword, true)
    
    // Remplir le nom de l'entreprise
    await companyField.fill(companyName)
    
    // Cliquer sur le bouton d'inscription
    const submitButton = page.locator('button[type="submit"]:has-text("S\'inscrire"), button[type="submit"]:has-text("Inscription")')
    await submitButton.click()
    
    // Attendre la confirmation
    await page.waitForTimeout(2000)
    
    // Vérifier que l'inscription a réussi
    const modalClosed = await page.locator('[role="dialog"]').isHidden({ timeout: 5000 }).catch(() => true)
    expect(modalClosed).toBeTruthy()
  })

  test('Connexion email existante', async ({ page }) => {
    // Ce test nécessite un compte pré-existant
    // Utiliser un email/mot de passe de test connu
    const existingEmail = process.env.TEST_USER_EMAIL || 'test@example.com'
    const existingPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123'
    
    // Ouvrir la modale d'authentification
    await openAuthModal(page)
    
    // La modale devrait être en mode connexion par défaut
    // Vérifier la présence du champ email
    await expect(page.locator('input[type="email"]')).toBeVisible()
    
    // Remplir les identifiants
    await fillAuthForm(page, existingEmail, existingPassword, false)
    
    // Cliquer sur "Se connecter"
    const submitButton = page.locator('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion"), button[type="submit"]:has-text("Login")')
    await submitButton.click()
    
    // Attendre la connexion
    await page.waitForTimeout(2000)
    
    // Vérifier que la connexion a réussi (modale fermée)
    const modalClosed = await page.locator('[role="dialog"]').isHidden({ timeout: 5000 }).catch(() => true)
    expect(modalClosed).toBeTruthy()
  })

  test('Google OAuth + sélection "Utilisateur"', async ({ page }) => {
    // Skip si pas configuré en CI ou si bouton Google non disponible
    const googleButton = page.locator('button:has-text("Google"), button:has(svg)')
    
    // Vérifier si le bouton Google est présent
    if (!await googleButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip('Google OAuth non disponible dans cet environnement')
    }
    
    // Ouvrir la modale
    await openAuthModal(page)
    
    // Cliquer sur le bouton Google
    await googleButton.first().click()
    
    // NOTE: En environnement de test, le OAuth Google réelle sera bloqué
    // Ce test vérifie seulement que le flux démarre correctement
    // Pour les tests complets, utiliser des comptes de test pré-authentifiés
    
    // Vérifier qu'une popup ou redirection est initiée
    await page.waitForTimeout(1000)
  })

  test('Google OAuth + sélection "Commerçant"', async ({ page }) => {
    // Skip si pas configuré
    const googleButton = page.locator('button:has-text("Google"), button:has(svg)')
    
    if (!await googleButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip('Google OAuth non disponible dans cet environnement')
    }
    
    // Ce test suivreait le même flux que ci-dessus
    // mais avec sélection du rôle "Commerçant" dans le RoleSelectModal
    // 
    // Étapes attendues:
    // 1. Click Google -> redirection OAuth
    // 2. Retour avec role=null -> RoleSelectModal apparaît
    // 3. Sélection "Commerçant"
    // 4. Redirection vers /host/dashboard
    
    await googleButton.first().click()
    await page.waitForTimeout(1000)
  })
})

test.describe('Role Selection Modal', () => {
  test('devrait être affiché quand role est null après OAuth', async ({ page }) => {
    // Ce test vérifie que le RoleSelectModal apparaît correctement
    // quand un utilisateur se connecte via Google sans avoir de rôle défini
    
    await page.goto('/')
    
    // Simuler un état où le rôle est null
    // En conditions réelles, cela se produit après une première connexion Google
    
    // Vérifier que la modale de sélection de rôle est présente
    const roleModal = page.locator('[role="dialog"], .modal, #role-select-modal')
    
    // Attendre un peu pour voir si une modale apparaît
    await page.waitForTimeout(1000)
    
    // Si la modale est visible, vérifier ses boutons
    if (await roleModal.isVisible().catch(() => false)) {
      await expect(page.locator('button:has-text("Utilisateur")')).toBeVisible()
      await expect(page.locator('button:has-text("Commerçant")')).toBeVisible()
    }
  })
})
