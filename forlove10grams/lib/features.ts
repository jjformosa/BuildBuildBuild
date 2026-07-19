// Feature flags. NEXT_PUBLIC_* is inlined into the client bundle at build time
// and readable via process.env on the server, so one flag gates both UI and API.
// Unset = off, so production stays disabled unless the env var is explicitly set.
export const AUDIO_ENABLED = process.env.NEXT_PUBLIC_FEATURE_AUDIO === 'true'
