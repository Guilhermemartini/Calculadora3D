const isProduction = process.env.NODE_ENV === "production"
if (isProduction) throw new Error("Local account provisioning is disabled in production.")

const accountName = process.env.AUTH_PROVISION_NAME?.trim()
const email = process.env.AUTH_PROVISION_EMAIL?.trim().toLowerCase()
const password = process.env.AUTH_PROVISION_PASSWORD
const grantLegacy = process.argv.includes("--grant-legacy")

if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  throw new Error("Set DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL before provisioning.")
}
if (!accountName || !email || !password || password.length < 12) {
  throw new Error("Set AUTH_PROVISION_NAME, AUTH_PROVISION_EMAIL, and a password of at least 12 characters.")
}

// This process is a local, trusted provisioning command. The app server never
// receives this flag, so its public sign-up endpoint stays disabled.
process.env.AUTH_PROVISION_MODE = "1"

async function main() {
  const { auth, authDatabase } = await import("@/lib/auth")

  try {
    const created = await auth.api.signUpEmail({ body: { name: accountName!, email: email!, password: password! } })
    if (!created.user?.id) throw new Error("The account could not be created.")

    if (grantLegacy) {
      await authDatabase.query(
        `INSERT INTO legacy_data_access (user_id, module_key)
         SELECT $1, module_key
         FROM unnest(ARRAY['calculator', 'filaments', 'agenda', 'shortcuts', 'budgets']::text[]) AS module_key
         ON CONFLICT (user_id, module_key) DO NOTHING`,
        [created.user.id],
      )
    }

    console.log(`Created account ${created.user.email} (${created.user.id}).`)
    if (grantLegacy) console.log("Explicitly granted access to the current shared legacy datasets.")
    else console.log("No legacy data access was granted.")
  } finally {
    await authDatabase.end()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Account provisioning failed.")
  process.exitCode = 1
})

export {}
