export type SessionData = {
  did: string;
  handle: string;
  isLoggedIn: true;
};

export type EmptySession = {
  isLoggedIn: false;
};

export type AnySession = SessionData | EmptySession;
