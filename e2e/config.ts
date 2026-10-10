// E2E_BASE_URL points the suite at a server you started yourself, for when
// the default port already belongs to another app (reuseExistingServer would
// otherwise test that app).
const defaultBaseURL = process.env.CI
  ? "http://localhost:4173"
  : "http://localhost:5173";

export const baseURL = process.env.E2E_BASE_URL ?? defaultBaseURL;
