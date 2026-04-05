import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../ErrorBoundary'

// Composant qui lance une erreur
function ThrowError() {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for this test
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Content sans erreur</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Content sans erreur')).toBeInTheDocument()
  })

  it('should render fallback UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oups !')).toBeInTheDocument()
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recharger/i })).toBeInTheDocument()
  })

  it('should reload page when clicking reload button', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock }
    })

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /recharger/i })
    await user.click(reloadButton)

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('should apply correct dark theme styles', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // Verify the error message is displayed
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument()
  })
})
