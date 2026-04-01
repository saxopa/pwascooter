import { supabase } from './supabaseClient'

type InvokeOptions = {
  body?:
    | string
    | Record<string, unknown>
    | Blob
    | ArrayBuffer
    | FormData
    | ReadableStream<Uint8Array>
  headers?: Record<string, string>
  signal?: AbortSignal
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function isUserAccessToken(token: string | null | undefined) {
  return Boolean(
    token &&
    token.startsWith('eyJ') &&
    token !== supabaseAnonKey &&
    token.split('.').length === 3 &&
    token.length > 100,
  )
}

async function waitForAuthInitialization(timeoutMs = 1200) {
  await new Promise<void>((resolve) => {
    let settled = false
    let unsubscribe: (() => void) | null = null

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      unsubscribe?.()
      resolve()
    }

    const timer = window.setTimeout(finish, timeoutMs)
    const subscription = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        finish()
      }
    })
    unsubscribe = () => subscription.data.subscription.unsubscribe()
  })
}

async function readCurrentSessionToken() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error('AUTH_SESSION_UNAVAILABLE')
  }

  return data.session?.access_token ?? null
}

async function getAccessToken() {
  await waitForAuthInitialization()

  let accessToken = await readCurrentSessionToken()
  if (isUserAccessToken(accessToken)) {
    return accessToken as string
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('AUTH_SESSION_EXPIRED')
  }

  accessToken = await readCurrentSessionToken()
  if (isUserAccessToken(accessToken)) {
    return accessToken as string
  }

  return refreshAccessToken()
}

async function refreshAccessToken() {
  const { data, error } = await supabase.auth.refreshSession()

  const accessToken = data.session?.access_token ?? null

  if (error || !isUserAccessToken(accessToken)) {
    throw new Error('AUTH_SESSION_EXPIRED')
  }

  return accessToken as string
}

async function postFunction(
  functionName: string,
  accessToken: string,
  options: InvokeOptions,
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  const rawText = await response.text()
  let parsed: unknown = null

  if (rawText) {
    try {
      parsed = JSON.parse(rawText)
    } catch {
      parsed = rawText
    }
  }

  return { response, parsed }
}

export async function invokeAuthedFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {},
) {
  let accessToken = await getAccessToken()
  let { response, parsed } = await postFunction(functionName, accessToken, options)

  if (response.status === 401) {
    accessToken = await refreshAccessToken()
    const retry = await postFunction(functionName, accessToken, options)
    response = retry.response
    parsed = retry.parsed
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
        ? parsed.error
        : `Function ${functionName} failed with status ${response.status}`

    return {
      data: null as T | null,
      error: {
        message,
        status: response.status,
      },
    }
  }

  return {
    data: parsed as T,
    error: null,
  }
}
