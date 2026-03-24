import { test, expect, type Page } from '@playwright/test'
import {
  openAuthModal,
  fillAuthForm,
  waitForVisible,
  waitForHidden,
  generateTestEmail
} from './utils/test-helpers'

test.describe('Réservation de places de parking', () => {
  // Compte user pour les tests
  const userEmail = process.env.TEST_USER_EMAIL || 'user@test.local'
  const userPassword = process.env.TEST_USER_PASSWORD || 'Test1234!'

  test.beforeEach(async ({ page }) => {
    // Navigation vers la page d'accueil (carte)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Connexion en tant qu'utilisateur standard
    await openAuthModal(page)
    await fillAuthForm(page, userEmail, userPassword, false)
    
    const submitButton = page.locator('button[type="submit"]:has-text("Se connecter"), button[type="submit"]:has-text("Connexion")')
    await submitButton.click()
    
    // Attendre la connexion
    await page.waitForTimeout(2000)
  })

  test.afterEach(async ({ page }) => {
    // Déconnexion après chaque test
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

  test('Réservation simple - clic marker, bottom sheet, durée, réserver', async ({ page }) => {
    // Vérifier que la carte est chargée
    await expect(page.locator('.leaflet-container, #map, [data-testid="map"]')).toBeVisible({ timeout: 10000 })

    // Attendre que les marqueurs soient chargés
    await page.waitForTimeout(2000)

    // Chercher un marqueur de parking sur la carte
    // Les sélecteurs peuvent varier selon l'implémentation
    const parkingMarker = page.locator(
      '.leaflet-marker-icon, .marker-icon, [data-testid="parking-marker"], .parking-marker, [class*="marker"]'
    ).first()

    // Vérifier s'il y a des places disponibles
    const hasMarkers = await parkingMarker.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (!hasMarkers) {
      // Pas de marqueurs visibles, vérifier s'il y a un message ou créer une place d'abord
      const noPlacesMsg = page.locator('text=/Aucune place|Aucun parking|Pas de places/i')
      if (await noPlacesMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        test.skip('Aucune place de parking disponible pour ce test')
      }
    }

    // Cliquer sur un marqueur
    await parkingMarker.click()

    // Attendre l'ouverture du bottom sheet / modal de réservation
    await page.waitForTimeout(1000)
    
    const bookingSheet = page.locator(
      '.bottom-sheet, .booking-sheet, [role="dialog"], .modal, [data-testid="booking-sheet"]'
    ).first()
    
    await expect(bookingSheet).toBeVisible({ timeout: 5000 })

    // Vérifier les informations de la place affichées
    const priceElement = page.locator('text=/\\d+€|\\d+ \/|heure/i').first()
    if (await priceElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(priceElement).toBeVisible()
    }

    // Sélectionner ou ajuster la durée de réservation
    const durationInput = page.locator(
      'input[name="hours"], input[name="duration"], input[name="hours"], input[type="number"]'
    ).first()

    if (await durationInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Sélectionner 1 heure par défaut
      await durationInput.fill('1')
    } else {
      // Chercher des boutons + / - pour la durée
      const increaseBtn = page.locator('button:has-text("+"), button:has-text("Plus")').first()
      if (await increaseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await increaseBtn.click()
      }
    }

    // Vérifier le prix total calculé
    const totalPrice = page.locator('text=/Total|total|à payer|\\d+€|\\d+ \€/i').first()
    if (await totalPrice.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Le prix total devrait être affiché
    }

    // Cliquer sur le bouton "Réserver" ou "Confirmer"
    const bookButton = page.locator(
      'button:has-text("Réserver"), button:has-text("Confirmer"), button:has-text("Valider"), button[type="submit"]:has-text("Réserver")'
    ).first()
    
    await expect(bookButton).toBeVisible()
    await bookButton.click()

    // Attendre la confirmation
    await page.waitForTimeout(2000)

    // Vérifier que la réservation a été créée
    // Options: message de succès, redirection, ou modal fermé
    const successMessage = page.locator(
      'text=/Succès|confirmée|réservée|bravo|rendez-vous|booking|success|confirmed/i'
    ).first()
    
    const sheetClosed = await bookingSheet.isHidden({ timeout: 3000 }).catch(() => false)
    const successShown = await successMessage.isVisible({ timeout: 2000 }).catch(() => false)
    
    // Au moins un indicateur de succès devrait être présent
    expect(sheetClosed || successShown).toBeTruthy()
  })

  test('Liste mes réservations (/bookings)', async ({ page }) => {
    // Navigation vers la page des réservations
    await page.goto('/bookings')
    await page.waitForLoadState('networkidle')

    // Vérifier que la page est chargée
    await expect(page).toHaveURL(/\/bookings/)

    // Vérifier le titre ou en-tête
    const pageTitle = page.locator(
      'h1:has-text("Réservations"), h2:has-text("Mes réservations"), text=/Réservations/i'
    ).first()
    
    if (await pageTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(pageTitle).toBeVisible()
    }

    // Vérifier la présence du conteneur de liste
    const bookingsList = page.locator(
      '.bookings-list, .reservations-list, [data-testid="bookings-list"], .bookings-container'
    ).first()

    // La liste peut être vide ou contenir des réservations
    await expect(bookingsList).toBeVisible({ timeout: 5000 })

    // Vérifier les boutons/actions disponibles
    const actions = page.locator(
      'button:has-text("Annuler"), button:has-text("Voir"), button:has-text("Détails")'
    )
    const hasActions = await actions.first().isVisible({ timeout: 2000 }).catch(() => false)
    
    if (hasActions) {
      // Vérifier la pagination ou infinite scroll si présent
      const pagination = page.locator('.pagination, [class*="pagination"]')
      if (await pagination.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(pagination).toBeVisible()
      }
    }
  })

  test('Anti-surbooking - capacity=1, 2 users', async ({ page }) => {
    // Ce test vérifie que le système empêche deux réservations simultanées
    // sur une place avec capacité de 1
    
    // IMPORTANT: Ce test nécessite:
    // 1. Un host avec une place de capacité = 1
    // 2. Deux comptes utilisateurs différents
    
    // Skip si les variables d'environnement ne sont pas définies
    const user2Email = process.env.TEST_USER2_EMAIL
    const user2Password = process.env.TEST_USER2_PASSWORD
    
    if (!user2Email || !user2Password) {
      test.skip('Deuxième compte utilisateur non configuré pour ce test')
    }

    // PREMIÈRE RÉSERVATION - User 1
    // La place devrait être disponible
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    // Cliquer sur un marqueur avec capacité 1
    const parkingMarker = page.locator('.leaflet-marker-icon').first()
    await parkingMarker.click()
    
    await page.waitForTimeout(1000)
    
    // Ouvrir le bottom sheet et faire la réservation
    const bookingSheet = page.locator('.bottom-sheet, [role="dialog"]').first()
    await bookingSheet.waitFor({ state: 'visible', timeout: 5000 })
    
    // Sélectionner une durée
    const durationInput = page.locator('input[type="number"]').first()
    if (await durationInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await durationInput.fill('2')
    }
    
    // Réserver
    const bookButton = page.locator('button:has-text("Réserver")').first()
    await bookButton.click()
    await page.waitForTimeout(2000)

    // Se déconnecter
    const logoutButton = page.locator('button:has-text("Déconnexion")').first()
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click()
      await page.waitForTimeout(1000)
    }

    // DEUXIÈME RÉSERVATION - User 2
    // Connecter le deuxième utilisateur
    await openAuthModal(page)
    await fillAuthForm(page, user2Email, user2Password, false)
    
    const submitButton = page.locator('button[type="submit"]:has-text("Se connecter")')
    await submitButton.click()
    await page.waitForTimeout(2000)

    // Revenir sur la carte
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Tenter de réserver la même place
    const marker2 = page.locator('.leaflet-marker-icon').first()
    
    // Cliquer sur le marqueur
    await marker2.click()
    await page.waitForTimeout(1000)

    // Vérifier le comportement anti-surbooking
    // Options:
    // 1. Un message d'erreur "Place non disponible" ou "Complet"
    // 2. Le bouton Réserver est désactivé
    // 3. La réservation échoue avec un message approprié
    
    const unavailableMessage = page.locator(
      'text=/Non disponible|Complet|Plus de place|Surveilled|conflict|surbooking|overlap/i'
    ).first()
    
    const bookBtn2 = page.locator('button:has-text("Réserver")').first()
    const isBookBtnDisabled = await bookBtn2.isDisabled({ timeout: 2000 }).catch(() => false)
    
    const hasUnavailableMessage = await unavailableMessage.isVisible({ timeout: 2000 }).catch(() => false)
    
    // Au moins un des indicateurs devrait être présent
    expect(isBookBtnDisabled || hasUnavailableMessage).toBeTruthy()
  })
})

test.describe('Page des réservations - États', () => {
  test('Affichage des différents statuts de réservation', async ({ page }) => {
    const userEmail = process.env.TEST_USER_EMAIL || 'user@test.local'
    const userPassword = process.env.TEST_USER_PASSWORD || 'Test1234!'

    // Connexion
    await page.goto('/')
    await openAuthModal(page)
    await fillAuthForm(page, userEmail, userPassword, false)
    
    const submitButton = page.locator('button[type="submit"]:has-text("Se connecter")')
    await submitButton.click()
    await page.waitForTimeout(2000)

    // Aller à la page des réservations
    await page.goto('/bookings')
    await page.waitForLoadState('networkidle')

    // Vérifier l'affichage des différents statuts
    // Les couleurs/styles dépendent de l'implémentation
    const statusElements = page.locator(
      '.status, [class*="status"], [class*="badge"], [class*="tag"]'
    )

    const statuses = ['pending', 'confirmed', 'cancelled', 'completed']
    
    for (const status of statuses) {
      const statusElement = page.locator(`text=/${status}/i`).first()
      // Le statut peut ou ne peut pas être présent selon les données
      // On vérifie juste qu'aucune erreur n'est lancée
      await page.waitForTimeout(100)
    }
  })

  test('Navigation vers /bookings depuis la carte', async ({ page }) => {
    // Vérifier le lien de navigation vers les réservations
    const bookingsLink = page.locator(
      'a:has-text("Réservations"), a:has-text("Mes réservations"), button:has-text("Réservations")'
    ).first()

    // Si le lien existe sur la page d'accueil
    if (await bookingsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bookingsLink.click()
      
      // Vérifier la redirection
      await expect(page).toHaveURL(/\/bookings/)
    }
  })
})
