export function withVerifiedSsl(connectionString: string | undefined) {
    if (!connectionString) return connectionString

    const url = new URL(connectionString)

    if (url.searchParams.get("sslmode") !== "require") {
        return connectionString
    }

    url.searchParams.set("sslmode", "verify-full")
    return url.toString()
}