import { supabase } from './supabase.ts'

/**
 * Makes sure the client holds a valid (refreshed) session, signing in
 * anonymously if not. Without this, supabase-js silently falls back to the
 * publishable key when a stored session has expired and can't be refreshed,
 * and the RPCs fail with "permission denied" because they run as `anon`.
 */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signedIn.session
}

/** Runs an RPC after ensuring a session, turning sign-in failures into an RPC-style error. */
export async function withSession<R>(
  call: () => PromiseLike<R>,
): Promise<R | { data: null; error: { message: string } }> {
  try {
    await ensureSession()
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } }
  }
  return call()
}
