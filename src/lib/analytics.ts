import type { Analytics } from 'firebase/analytics'

/**
 * Firebase Analytics (GA4). Config comes from VITE_FIREBASE_* env vars so the
 * site still builds and runs without them; analytics simply stays off.
 * The SDK is loaded lazily so it never blocks the first paint.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let analyticsPromise: Promise<Analytics | null> | null = null

export function initAnalytics(): Promise<Analytics | null> {
  if (analyticsPromise) return analyticsPromise
  analyticsPromise = (async () => {
    if (!config.appId || !config.measurementId) return null
    const [{ initializeApp }, { getAnalytics, isSupported }] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
    ])
    if (!(await isSupported())) return null
    return getAnalytics(initializeApp(config))
  })().catch((err) => {
    console.warn('[analytics] disabled:', err)
    return null
  })
  return analyticsPromise
}

/** Log a custom GA4 event. No-op when analytics is not configured. */
export async function trackEvent(name: string, params?: Record<string, unknown>) {
  const analytics = await initAnalytics()
  if (!analytics) return
  const { logEvent } = await import('firebase/analytics')
  logEvent(analytics, name, params)
}
