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

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error('AUTH_SESSION_UNAVAILABLE')
  }

  let session = data.session

  if (!session?.access_token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      throw new Error('AUTH_SESSION_EXPIRED')
    }
    session = refreshed.session
  }

  if (!session?.access_token) {
    throw new Error('AUTH_SESSION_EXPIRED')
  }

  return session.access_token
}

async function refreshAccessToken() {
  const { data, error } = await supabase.auth.refreshSession()

  if (error || !data.session?.access_token) {
    throw new Error('AUTH_SESSION_EXPIRED')
  }

  return data.session.access_token
}

async function postFunction(
  functionName: string,
  accessToken: string,
  options: InvokeOptions,
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

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
