const rawExtensionApiUrl =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITEAPIURL || import.meta.env?.VITE_API_URL)) ||
  'http://localhost:8080';
export const DEFAULT_SMARTSCHEDULE_API_URL = rawExtensionApiUrl.endsWith('/api/v1')
  ? rawExtensionApiUrl
  : `${rawExtensionApiUrl.replace(/\/+$/, '')}/api/v1`;

export const STORAGE_KEYS = {
  ACTIVE_SCHEDULE_ID: 'ss_active_schedule_id',
  AUTH_TOKEN: 'ss_auth_token',
  USER_PROFILE: 'ss_user_profile',
  CACHED_RULES: 'ss_cached_rules',
  RULES_CHECKSUM: 'ss_rules_checksum',
  RULES_FETCHED_AT: 'ss_rules_fetched_at',
  DEBUG_MODE: 'ss_debug_mode',
  IMPORT_HISTORY: 'ss_import_history',
  CUSTOM_API_URL: 'ss_api_url',
};

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'; // UTC+07:00

export const MESSAGE_TYPES = {
  CHECK_PORTAL: 'SS_CHECK_PORTAL',
  CHECK_PORTAL_RESULT: 'SS_CHECK_PORTAL_RESULT',
  EXTRACT_SCHEDULE: 'SS_EXTRACT_SCHEDULE',
  EXTRACT_SCHEDULE_RESULT: 'SS_EXTRACT_SCHEDULE_RESULT',
  GET_DIAGNOSTICS: 'SS_GET_DIAGNOSTICS',
};
