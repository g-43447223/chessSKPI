const REMOTE_VERSION_KEY = 'chessdesk:remoteVersion:v1'
const SYNC_CONFIG_KEY = 'chessdesk:syncConfig:v1'

export function getSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    if (!raw) return { url: '', token: '' }
    const parsed = JSON.parse(raw)
    return {
      url: String(parsed?.url ?? '').trim(),
      token: String(parsed?.token ?? '').trim(),
    }
  } catch {
    return { url: '', token: '' }
  }
}

export function setSyncConfig(config) {
  try {
    localStorage.setItem(
      SYNC_CONFIG_KEY,
      JSON.stringify({
        url: String(config?.url ?? '').trim(),
        token: String(config?.token ?? '').trim(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function getRemoteVersion() {
  try {
    return Number(localStorage.getItem(REMOTE_VERSION_KEY)) || 0
  } catch {
    return 0
  }
}

export function setRemoteVersion(version) {
  try {
    localStorage.setItem(REMOTE_VERSION_KEY, String(Number(version) || 0))
  } catch {
    /* ignore */
  }
}

export function clearRemoteVersion() {
  try {
    localStorage.removeItem(REMOTE_VERSION_KEY)
  } catch {
    /* ignore */
  }
}

export async function fetchRemoteState(config) {
  if (!config?.url || !config?.token) {
    return { ok: false, error: 'missing_config' }
  }
  const url = `${config.url}?token=${encodeURIComponent(config.token)}`
  const response = await fetch(url, { method: 'GET' })
  if (!response.ok) {
    return { ok: false, error: `http_${response.status}` }
  }
  const data = await response.json()
  if (!data?.ok) {
    return { ok: false, error: data?.error || 'remote_error' }
  }
  return {
    ok: true,
    state: data.state ?? null,
    version: Number(data.version) || 0,
  }
}

export async function pushRemoteState(config, state, version) {
  if (!config?.url || !config?.token) {
    return { ok: false, error: 'missing_config' }
  }
  const response = await fetch(config.url, {
    method: 'POST',
    body: JSON.stringify({
      token: config.token,
      state,
      version: Number(version) || 0,
    }),
  })
  if (!response.ok) {
    return { ok: false, error: `http_${response.status}` }
  }
  const data = await response.json()
  if (data?.conflict) {
    return {
      ok: false,
      conflict: true,
      state: data.state ?? null,
      version: Number(data.version) || 0,
    }
  }
  if (!data?.ok) {
    return { ok: false, error: data?.error || 'remote_error' }
  }
  return { ok: true, version: Number(data.version) || 0 }
}
