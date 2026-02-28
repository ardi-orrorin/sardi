export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE
};

export const AUTH_COOKIE_CLEAR_OPTIONS = {
  ...AUTH_COOKIE_OPTIONS,
  maxAge: 0
};

export const AUTH_SERVICE_NAME = "sardi";
