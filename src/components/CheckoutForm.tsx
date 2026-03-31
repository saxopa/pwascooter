import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabaseClient'
import { Loader2 } from 'lucide-react'

export interface ConfirmedBookingPayload {
  bookingId: string
  pickupCode: string | null
}

interface CheckoutFormProps {
  paymentIntentId: string
  onSuccess: (payload: ConfirmedBookingPayload) => void
}

export default function CheckoutForm({ paymentIntentId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStripeReady, setIsStripeReady] = useState(false)

  const handlePaymentClick = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!stripe || !elements) return

    setIsLoading(true)
    setMessage(null)

    try {
      // Force UI validation explicite depuis Stripe
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setMessage(submitError.message ?? 'Veuillez vérifier vos informations.')
        setIsLoading(false)
        return
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, 
        },
        redirect: 'if_required', 
      })

      if (error) {
        setMessage(error.message ?? 'Erreur de paiement.')
        setIsLoading(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const { data, error: confirmError } = await supabase.functions.invoke('confirm-booking-payment', {
          body: { paymentIntentId },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (confirmError || !data?.ok || !data?.bookingId) {
          console.error('Erreur de confirmation de réservation après paiement:', confirmError ?? data)
          setMessage('Paiement réussi mais réservation non confirmée. Contactez le support si le débit apparaît.')
          setIsLoading(false)
        } else {
          onSuccess({
            bookingId: data.bookingId as string,
            pickupCode: typeof data.pickupCode === 'string' ? data.pickupCode : null,
          })
        }
      } else {
        setMessage('Paiement en cours de traitement...')
        setIsLoading(false)
      }
    } catch (err: unknown) {
      console.error(err)
      setMessage(err instanceof Error ? err.message : 'Erreur inattendue.')
      setIsLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', textAlign: 'left', minHeight: 200, position: 'relative' }}>
      {!isStripeReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', zIndex: 10 }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary-light)' }} />
        </div>
      )}
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} onReady={() => setIsStripeReady(true)} />
      <button
        disabled={isLoading || !stripe || !elements || !isStripeReady}
        onClick={handlePaymentClick}
        className="btn-primary"
        style={{ width: '100%', marginTop: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Traitement...
          </>
        ) : (
          'Payer et Confirmer'
        )}
      </button>

      {message && <div style={{ marginTop: 16, color: 'var(--color-danger)', fontSize: '0.9rem', textAlign: 'center' }}>{message}</div>}
    </div>
  )
}
