import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query) return NextResponse.json({ error: "Endereço não informado." }, { status: 400 })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "Calculadora3D/1.0 contato@calculadora3d.local" }, next: { revalidate: 3600 } })
  if (!response.ok) return NextResponse.json({ error: "Serviço de endereços indisponível." }, { status: 502 })
  const results = await response.json()
  if (!results[0]) return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 })
  return NextResponse.json({ lat: Number(results[0].lat), lon: Number(results[0].lon), displayName: results[0].display_name })
}
