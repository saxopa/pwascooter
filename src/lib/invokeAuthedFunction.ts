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

export async function invokeAuthedFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {},
) {
  const accessToken = await getAccessToken()

  return supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })
}
