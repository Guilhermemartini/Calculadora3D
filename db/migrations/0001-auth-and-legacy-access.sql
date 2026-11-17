-- Authentication tables for Better Auth and explicit access grants for the
-- existing ownerless datasets. This migration intentionally does not change
-- or assign ownership to any existing business table.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth."user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth."session" (
  id text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON auth."session" ("userId");

CREATE TABLE auth.account (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX "account_userId_idx" ON auth.account ("userId");

CREATE TABLE auth.verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON auth.verification (identifier);

CREATE TABLE auth.legacy_data_access (
  user_id text NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE,
  module_key text NOT NULL CHECK (module_key IN ('calculator', 'filaments', 'agenda', 'shortcuts', 'budgets')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_key)
);
