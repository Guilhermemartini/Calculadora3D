# Local authentication and legacy data access

Authentication uses Better Auth with PostgreSQL-backed users and sessions. The
schema is in `db/migrations/0001-auth-and-legacy-access.sql`. Apply that file
manually to a disposable local database before starting the app. It creates the
`auth` schema and does not alter business tables or assign owners to existing
records.

## Local setup

1. Set `DATABASE_URL` to a disposable PostgreSQL database.
2. Generate a local secret with `openssl rand -base64 32` and set it as
   `BETTER_AUTH_SECRET`.
3. Set `BETTER_AUTH_URL=http://localhost:3000`.
4. Apply `db/migrations/0001-auth-and-legacy-access.sql` to that test database.
5. Provide account details in the environment and run the trusted provisioning
   command. To make the account the explicitly enabled legacy test account,
   pass `--grant-legacy`:

   ```sh
   export AUTH_PROVISION_NAME='Local Test User'
   export AUTH_PROVISION_EMAIL='test@example.invalid'
   read -s AUTH_PROVISION_PASSWORD
   pnpm auth:provision -- --grant-legacy
   unset AUTH_PROVISION_PASSWORD
   ```

   Without `--grant-legacy`, the new account can authenticate but cannot read
   any existing module data. The command refuses to run with
   `NODE_ENV=production`. Credentials are provided at runtime and are not
   committed. Do not reuse the example email or local password in production.

Email/password sign-up is disabled in the application process. The provisioning
command enables it only in its own short-lived process to create the requested
account; it exposes no public registration screen or HTTP provisioning route.
Passwords are hashed by Better Auth. Sessions are stored in PostgreSQL with a
12-hour expiry and refreshed while active.

## Legacy access boundary

All existing business tables are still shared and have no row owner. The
`auth.legacy_data_access` table is a temporary, explicit module-level gate, not
row-level tenancy. A grant gives that account access to every existing record
in the selected module. No role, including a future `SUPER_ADMIN` or `ADMIN`,
implicitly bypasses this gate. New accounts receive no grants by default.

| Module key | Current shared records gated by the grant |
| --- | --- |
| `calculator` | `calculator_settings`, including `id = 'default'` |
| `filaments` | `filaments`, `filament_usage` |
| `agenda` | `agenda_tasks`, commemorative dates, commemorative STL metadata/files |
| `shortcuts` | `shortcut_groups`, `shortcuts` |
| `budgets` | `budgets`, including embedded STL data |

No grant should be added for a real account until the product confirms that it
is the intended recipient of those shared records. Unknown ownership remains
unassigned and inaccessible. A future ownership migration needs a reviewed
record inventory, an approved recipient or a restricted legacy workspace, and
a backup/restore plan before adding owner columns and moving rows.

## Files and browser preferences requiring migration

Agenda images, shortcut images, and commemorative STL files were uploaded with
public Blob access. Protecting the application routes does not revoke existing
public URLs. After copying them to private storage, verify that the old public
URLs are deleted or disabled, anonymous requests fail, an authorized owner can
download them, and another account cannot. Budget STL files are embedded as
Data URLs in PostgreSQL; they need a bounded private file migration and an
authorized download path. Placeholder assets in `public/` are not user data.

Freight preferences (`calculadora3d-freight-preferences`) live in each browser's
`localStorage`, not PostgreSQL. Import them only from a browser profile whose
owner has been confirmed, into that account's future settings record, then
verify the account in another browser before clearing the local copy.

The schema of the existing business tables has not been confirmed against an
authorized production database. This migration and access gate are for
authentication setup only; do not apply it to production until the schema,
database role permissions, and legacy data recipient have been reviewed.
