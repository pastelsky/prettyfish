const analyticsKey = 'phc_uJGijY8E6V8Wge3PddD2bs6zKkK89hegJAaYVxgMYGW9'
const analyticsHost = 'https://a.pretty.fish'
const analyticsUiHost = 'https://us.posthog.com'

let initialized = false
let posthogPromise: Promise<typeof import('posthog-js')['default']> | null = null

async function getPosthog() {
  posthogPromise ??= import('posthog-js').then((module) => module.default)
  return posthogPromise
}

export async function initAnalytics() {
  if (initialized || !analyticsKey) return

  const posthog = await getPosthog()
  posthog.init(analyticsKey, {
    api_host: analyticsHost,
    ui_host: analyticsUiHost,
    defaults: '2026-01-30',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: 'if_capture_pageview',
    disable_session_recording: true,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_external_dependency_loading: true,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    person_profiles: 'identified_only',
  })

  initialized = true
}

export async function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  const posthog = await getPosthog()
  posthog.capture(event, properties)
}
