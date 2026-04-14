import { loadStripe } from '@stripe/stripe-js'

let stripePromiseCache: ReturnType<typeof loadStripe> | null = null

export function getStripePromise() {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined
    if (!key || key.trim() === '') return null
    if (!stripePromiseCache) {
        stripePromiseCache = loadStripe(key)
    }
    return stripePromiseCache
}
