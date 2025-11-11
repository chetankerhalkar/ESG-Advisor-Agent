export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "default-jwt-secret-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl:
    process.env.BUILT_IN_FORGE_API_URL ??
    process.env.OPENAI_API_URL ??
    "https://api.openai.com/v1",
  forgeApiKey:
    process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  forgePrimaryModel:
    process.env.BUILT_IN_FORGE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  forgeFallbackModel:
    process.env.BUILT_IN_FORGE_FALLBACK_MODEL ??
    process.env.OPENAI_FALLBACK_MODEL ??
    "gpt-5",
};
