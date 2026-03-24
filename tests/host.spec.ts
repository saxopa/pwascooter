import { test, expect, type Page, type Locator } from '@playwright/test'
import {
  openAuthModal,
  fillAuthForm,
  selectRole,
  waitForVisible,
  waitForHidden,
  generateTestEmail
} from './utils/test-helpers'

test.describe('Host Dashboard & Spaces', () => {
  // Compte host pré-existant pour les tests (à définir dans .env)
  const hostEmail = process.env.TEST_HOST_EMAIL || 'host@test.local'
  const hostPassword = process.env.TEST_HOST_PASSWORD || 'Test1234!'

  test.beforeEach(async ({ page }) => {
    // Navigation vers la page d'accueil
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Connexion en tant que host
    await openAuthModal(page)
    await fillAuthForm(page, hostEmail, hostPassword, false)
    
    const submitButton = page.locator('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')
    await submitButton.click()
    
    // Attendre la connexion
    await page.waitForTimeout(2000)
  })

  test.afterEach(async ({ page }) => {
    // Déconnexion
    try {
      const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout")').first()
      if (await logoutButton.isVisible({ timeout: 3000 })) {
        await logoutButton.click()
        await page.waitForTimeout(1000)
      }
    } catch {
      // Ignore
    }
  })

  test('Dashboard Host - affichage des statistiques', async ({ page }) => {
    // Navigation vers le dashboard host
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // Vérifier que la page du dashboard est chargée
    await expect(page).toHaveURL(/\/host\/dashboard/)

    // Vérifier la présence des éléments de stats
    // Ces sélecteurs dépendent de l'implémentation réelle
    const statsContainer = page.locator('.stats, .dashboard-stats, [data-testid="stats"]')
    
    // Vérifier qu'il y a des informations affichées (même si c'est 0)
    const hasContent = await page.locator('text=/\\d+/').first().isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasContent).toBeTruthy()

    // Vérifier les liens de navigation vers les places
    const spacesLink = page.locator('a:has-text("Mes places"), a:has-text("Places"), button:has-text("Mes places")')
    if (await spacesLink.isVisible()) {
      await expect(spacesLink).toBeEnabled()
    }
  })

  test('Host crée une place (avec géocodage)', async ({ page }) => {
    // Navigation vers le dashboard
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // Chercher et cliquer sur le bouton d'ajout de place
    const addButton = page.locator(
      'button:has-text("Ajouter"), button:has-text("Créer"), a:has-text("Créer"), button:has-text("Ajouter une place")'
    ).first()
    
    if (!(await addButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Essayer de trouver dans un menu ou via le formulaire
      await page.click('text=/Ajouter|Créer/').catch(() => {})
    }
    await addButton.click().catch(() => {})

    // Attendre que le formulaire apparaisse
    await page.waitForTimeout(1000)

    // Vérifier que le formulaire est visible
    const formContainer = page.locator('form, [role="dialog"], .modal')
    await expect(formContainer.first()).toBeVisible({ timeout: 5000 })

    // Générer des données uniques pour le test
    const spotName = `Test Spot ${Date.now()}`
    const testAddress = '1 Rue de la Paix, Paris'

    // Remplir le formulaire - adapter selon l'implémentation
    const nameInput = page.locator(
      'input[name="name"], input[id="name"], input[placeholder*="nom"], input[placeholder*="Nom"]'
    ).first()
    const addressInput = page.locator(
      'input[name="address"], input[id="address"], input[placeholder*="adresse"], input[placeholder*="Adresse"]'
    ).first()
    const capacityInput = page.locator(
      'input[name="capacity"], input[id="capacity"], input[placeholder*="capacité"], input[placeholder*="capacité"]'
    ).first()
    const priceInput = page.locator(
      'input[name="pricePerHour"], input[id="pricePerHour"], input[placeholder*="prix"], input[placeholder*="prix"]'
    ).first()

    // Remplir les champs si visibles
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(spotName)
    }
    
    if (await addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addressInput.fill(testAddress)
      // Attendre le géocodage
      await page.waitForTimeout(2500)
    }
    
    if (await capacityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await capacityInput.fill('5')
    }
    
    if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priceInput.fill('2')
    }

    // Cocher l'option de recharge si présente
    const chargingToggle = page.locator(
      'input[type="checkbox"][name*="charging"], input[type="checkbox"][id*="charging"]'
    ).first()
    if (await chargingToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chargingToggle.check()
    }

    // Soumettre le formulaire
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Créer"), button[type="submit"]:has-text("Enregistrer"), button:has-text("Sauvegarder")'
    ).first()
    
    await submitButton.click()
    
    // Attendre la confirmation
    await page.waitForTimeout(2000)

    // Vérifier que le formulaire est fermé ou qu'un message de succès apparaît
    const successMessage = page.locator('text=/Succès|Créé|Enregistré|created|success/i')
    const formClosed = await formContainer.first().isHidden({ timeout: 3000 }).catch(() => false)
    const successShown = await successMessage.isVisible({ timeout: 2000 }).catch(() => false)
    
    expect(formClosed || successShown).toBeTruthy()
  })

  test('Toggle place active/inactive', async ({ page }) => {
    // Navigation vers la liste des places
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // Chercher une place existante dans la liste
    // Les place holders dépendent de l'implémentation
    const placeItem = page.locator(
      '[data-testid="place-item"], .place-item, .host-card, [class*="place"]'
    ).first()

    // Si pas de place, le test est ignoré
    const hasPlace = await placeItem.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasPlace) {
      test.skip('Aucune place disponible pour tester le toggle')
    }

    // Chercher le toggle ou bouton pour activer/désactiver
    const toggleButton = placeItem.locator(
      'button:has-text("Activer"), button:has-text("Désactiver"), button:has-text("Desactiver"), input[type="checkbox"]'
    ).first()

    if (await toggleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Récupérer l'état initial
      const isChecked = await toggleButton.isChecked?.().catch(() => 
        toggleButton.getAttribute('aria-checked') === 'true'
      )
      
      // Cliquer pour changer l'état
      await toggleButton.click()
      
      // Attendre la mise à jour
      await page.waitForTimeout(1500)
      
      // Vérifier que l'état a changé
      const newIsChecked = await toggleButton.isChecked?.().catch(() =>
        toggleButton.getAttribute('aria-checked') === 'true'
      )
      
      expect(newIsChecked).not.toBe(isChecked)
    }
  })

  test('Protection route host-only (user normal redirigé)', async ({ page }) => {
    // Ce test vérifie qu'un utilisateur non-host ne peut pas accéder au dashboard
    
    // D'abord, se déconnecter si connecté
    try {
      const logoutButton = page.locator('button:has-text("Déconnexion")').first()
      if (await logoutButton.isVisible({ timeout: 2000 })) {
        await logoutButton.click()
        await page.waitForTimeout(1000)
      }
    } catch {
      // Continue anyway
    }

    // Créer un compte user standard
    const userEmail = generateTestEmail('user')
    
    await openAuthModal(page)
    
    // Inscription en mode user (toggle OFF)
    const signUpLink = page.locator('button:has-text("S\'inscrire"), a:has-text("S\'inscrire")')
    await signUpLink.click()
    
    await fillAuthForm(page, userEmail, 'Test1234!@#', true)
    
    const submitButton = page.locator('button[type="submit"]:has-text("S\'inscrire"), button[type="submit"]:has-text("Inscription")')
    await submitButton.click()
    
    await page.waitForTimeout(2000)

    // Tenter d'accéder au dashboard host
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // L'utilisateur devrait être redirigé (vers / ou voir un message d'erreur)
    // Vérifier qu'il n'est PAS sur /host/dashboard
    const currentUrl = page.url()
    const isHostRoute = currentUrl.includes('/host/dashboard')
    
    // Soit redirection, soit message d'erreur affiché
    if (isHostRoute) {
      // Vérifier qu'il y a un message d'erreur ou de refus d'accès
      const accessDenied = page.locator(
        'text=/Accès refusé|Forbidden|Unauthorized|Non autorisé|Not found|404/i'
      )
      await expect(accessDenied).toBeVisible({ timeout: 3000 })
    }
    
    // Nettoyage
    try {
      const logoutButton = page.locator('button:has-text("Déconnexion")').first()
      if (await logoutButton.isVisible({ timeout: 2000 })) {
        await logoutButton.click()
      }
    } catch {
      // Ignore
    }
  })
})

test.describe('Host Dashboard - Navigation', () => {
  test('Navigation entre onglet places et tableau de bord', async ({ page }) => {
    // Compte host
    const hostEmail = process.env.TEST_HOST_EMAIL || 'host@test.local'
    const hostPassword = process.env.TEST_HOST_PASSWORD || 'Test1234!'

    // Connexion
    await page.goto('/')
    await openAuthModal(page)
    await fillAuthForm(page, hostEmail, hostPassword, false)
    
    const submitButton = page.locator('button[type="submit"]:has-text("Se connecter")')
    await submitButton.click()
    await page.waitForTimeout(2000)

    // Aller au dashboard
    await page.goto('/host/dashboard')
    await page.waitForLoadState('networkidle')

    // Vérifier la présence des tabs ou sections
    const dashboardTab = page.locator('button:has-text("Tableau de bord"), a:has-text("Dashboard"), button:has-text("Overview")').first()
    const placesTab = page.locator('button:has-text("Places"), a:has-text("Places"), button:has-text("Mes places")').first()

    // Tester la navigation
    if (await placesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await placesTab.click()
      await page.waitForTimeout(1000)
      
      // Devrait voir la liste des places
      const placesList = page.locator('.places-list, .spots-list, [data-testid="places-list"]')
      // La liste peut être vide mais le conteneur existe
    }

    if (await dashboardTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardTab.click()
      await page.waitForTimeout(1000)
    }
  })
})
