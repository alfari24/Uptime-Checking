declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STATUS_API_URL?: string
      CONFIG_FILE?: string
      PORT?: string
      HOST?: string
      CHECK_INTERVAL?: string
      DB_PATH?: string
      CLEANUP_DAYS?: string
      APPRISE_API_SERVER?: string
      RECIPIENT_URL?: string
      TIME_ZONE?: string
      GRACE_PERIOD?: string
      SKIP_NOTIFICATION_IDS?: string
      APP_TITLE?: string
    }
  }
}

export {}
