const ACCOUNT_SETUP_SESSION_COOKIE = "bumicerts_seen_account_setup_choice";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const cookie = cookies.find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return cookie.slice(name.length + 1);
}

function writeSessionCookie(name: string, value: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function parseSeenDidList(cookieValue: string | null): string[] {
  if (!cookieValue) {
    return [];
  }

  try {
    const decodedValue = decodeURIComponent(cookieValue);
    const parsedValue: unknown = JSON.parse(decodedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
  } catch {
    return [];
  }
}

function readSeenDidList() {
  return parseSeenDidList(readCookie(ACCOUNT_SETUP_SESSION_COOKIE));
}

export function hasSeenAccountSetupChoiceInSession(did: string) {
  return readSeenDidList().includes(did);
}

export function markAccountSetupChoiceSeenInSession(did: string) {
  const dids = readSeenDidList();

  if (dids.includes(did)) {
    return;
  }

  writeSessionCookie(
    ACCOUNT_SETUP_SESSION_COOKIE,
    JSON.stringify([...dids, did]),
  );
}
