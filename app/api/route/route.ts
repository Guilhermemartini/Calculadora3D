import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const from = params.get("from")
  const to = params.get("to")
  if (!from || !to) return NextResponse.json({ error: "Pontos da rota não informados." }, { status: 400 })
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`, { next: { revalidate: 300 } })
  if (!response.ok) return NextResponse.json({ error: "Serviço de rotas indisponível." }, { status: 502 })
  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) return NextResponse.json({ error: "Não foi possível encontrar uma rota entre os endereços." }, { status: 404 })
  return NextResponse.json({ coordinates: route.geometry.coordinates, distanceKm: route.distance / 1000, durationMin: Math.max(1, Math.round(route.duration / 60)) })
}
