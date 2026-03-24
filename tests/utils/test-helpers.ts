import { type Page, type Locator, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Client Supabase pour cleanup (utiliser variables d'environnement en production)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour les utilisateurs de test
export interface TestUser {
  email: string
  password: string
  role?: 'user' | 'host'
  companyName?: string
}

// Génère un email unique pour les tests
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}@test.scootsafe.local`
}

// Cleanup complet d'un utilisateur de test
export async function cleanupTestUser(email: string): Promise<void> {
  try {
    // Note: En environnement real, utiliser l'admin API de Supabase
    // Pour les tests locaux, le cleanup sera fait manuellement via l'UI
    console.log(`[Cleanup] Preparing cleanup for: ${email}`)
  } catch (error) {
    console.error(`[Cleanup] Error cleaning up user ${email}:`, error)
  }
}

// Attend qu'un élément soit visible avec timeout
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 30000
): Promise<Locator> {
  const locator = page.locator(selector)
  await locator.waitFor({ state: 'visible', timeout })
  return locator
}

// Attend qu'un élément soit caché
export async function waitForHidden(
  page: Page,
  selector: string,
  timeout = 30000
): Promise<void> {
  await page.locator(selector).waitFor({ state: 'hidden', timeout })
}

// Clique sur un élément et attend la navigation
export async function clickAndNavigate(
  page: Page,
  selector: string,
  timeout = 30000
): Promise<void> {
  await Promise.all([
    page.waitForURL(/.*/, { timeout }),
    page.click(selector)
  ])
}

// Remplit un formulaire d'authentification
export async function fillAuthForm(
  page: Page,
  email: string,
  password: string,
  isSignUp = false
): Promise<void> {
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  
  if (isSignUp) {
    await page.fill('input[name="confirmPassword"]', password)
  }
}

// Signe avec Google OAuth (simulation pour tests)
export async function signInWithGoogle(page: Page): Promise<void> {
  await page.click('button:has-text("Google")')
  // Note: En tests réels, une popup sera ouverte
  // Pour CI, utiliser des comptes de test pré-authentifiés
}

// Sélectionne un rôle dans le RoleSelectModal
export async function selectRole(
  page: Page,
  role: 'user' | 'host'
): Promise<void> {
  const roleButton = role === 'host'
    ? 'button:has-text("Commerçant")'
    : 'button:has-text("Utilisateur")'
  
  await page.click(roleButton)
  await waitForHidden(page, '[role="dialog"]')
}

// Ouvre la modale d'authentification
export async function openAuthModal(page: Page): Promise<void> {
  // Chercher un bouton de connexion dans le header ou sur la page
  const loginButton = page.locator('button:has-text("Connexion"), button:has-text("Se connecter"), button:has-text("Sign in")').first()
  
  if (await loginButton.isVisible()) {
    await loginButton.click()
    await waitForVisible(page, '[role="dialog"], .modal, #auth-modal')
  }
}

// Bascule le toggle "Je suis un commerçant" pour inscription host
export async function toggleHostMode(page: Page, enable = true): Promise<void> {
  const toggle = page.locator('input[type="checkbox"], .toggle, button:has-text("commerçant"), button:has-text("host")').first()
  
  if (await toggle.isVisible()) {
    const isChecked = await toggle.isChecked?.() ?? false
    if (isChecked !== enable) {
      await toggle.click()
    }
  }
}

// Crée une place de parking en tant que host
export async function createParkingSpot(
  page: Page,
  spotData: {
    name: string
    address: string
    capacity: number
    pricePerHour: number
    hasCharging?: boolean
  }
): Promise<void> {
  // Navigation vers le dashboard host
  await page.goto('/host/dashboard')
  
  // Cliquer sur "Ajouter une place"
  await page.click('button:has-text("Ajouter"), button:has-text("Créer"), a:has-text("Créer une place")')
  
  // Remplir le formulaire
  await page.fill('input[name="name"], #name, input[placeholder*="nom"]', spotData.name)
  await page.fill('input[name="address"], #address, input[placeholder*="adresse"]', spotData.address)
  
  // Attendre le géocodage (utilise Nominatim)
  await page.waitForTimeout(2000) // Délai pour géocodage
  
  await page.fill('input[name="capacity"], #capacity, input[placeholder*="capacité"]', spotData.capacity.toString())
  await page.fill('input[name="pricePerHour"], #pricePerHour, input[placeholder*="prix"]', spotData.pricePerHour.toString())
  
  if (spotData.hasCharging) {
    await page.click('input[type="checkbox"][name*="charging"], button:has-text("Recharge")')
  }
  
  // Soumettre
  await page.click('button[type="submit"], button:has-text("Créer"), button:has-text("Enregistrer")')
  
  // Attendre confirmation
  await page.waitForTimeout(1000)
}

// Effectue une réservation
export async function makeBooking(
  page: Page,
  durationHours = 1
): Promise<void> {
  // Cliquer sur un marqueur de parking sur la carte
  await page.click('.leaflet-marker-icon, .marker, [data-testid="parking-marker"]')
  
  // Attendre l'ouverture du bottom sheet
  await waitForVisible(page, '.bottom-sheet, .booking-sheet, [role="dialog"]')
  
  // Sélectionner la durée
  const durationInput = page.locator('input[name="hours"], input[name="duration"], input[type="number"]').first()
  if (await durationInput.isVisible()) {
    await durationInput.fill(durationHours.toString())
  }
  
  // Cliquer sur "Réserver"
  await page.click('button:has-text("Réserver"), button:has-text("Confirmer"), button[type="submit"]')
  
  // Attendre la confirmation
  await page.waitForTimeout(1500)
}

// Vérifie qu'un utilisateur non-host est redirigé
export async function expectHostRedirect(page: Page, userRole: 'user' | 'host'): Promise<void> {
  await page.goto('/host/dashboard')
  
  if (userRole === 'user') {
    // Devrait être redirigé vers la page d'accueil ou afficher une erreur
    await page.waitForURL('**/') // Attend une redirection
  } else {
    // Devrait rester sur le dashboard
    await expect(page).toHaveURL(/\/host\/dashboard/)
  }
}

// Vérifie que l'URL contient un chemin spécifique
export async function expectUrlContains(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(path))
}
