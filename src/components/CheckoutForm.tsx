import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabaseClient'
import { Loader2 } from 'lucide-react'

interface CheckoutFormProps {
  bookingId: string
  onSuccess: () => void
}

export default function CheckoutForm({ bookingId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setIsLoading(true)
    setMessage(null)

    // Confirm the payment
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Avoid full page reload in PWA
    })

    if (error) {
      setMessage(error.message ?? 'Erreur de paiement.')
      setIsLoading(false)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment successful, update booking status to active
      const { error: dbError } = await supabase
        .from('bookings')
        .update({ status: 'active' })
        .eq('id', bookingId)

      if (dbError) {
        console.error('Erreur DB après paiement:', dbError)
        setMessage('Paiement réussi mais erreur lors de la confirmation en base.')
        setIsLoading(false)
      } else {
        onSuccess()
      }
    } else {
      setMessage('Paiement en cours de traitement...')
      setIsLoading(false)
    }
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit} style={{ width: '100%', textAlign: 'left' }}>
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
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
    </form>
  )
}
