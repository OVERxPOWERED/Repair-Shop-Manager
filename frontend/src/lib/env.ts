export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0-dev",
  devPages: process.env.NEXT_PUBLIC_ENABLE_DEV_PAGES === "true",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
};
