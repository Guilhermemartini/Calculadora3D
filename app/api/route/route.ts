import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const from = params.get("from")
  const to = params.get("to")
  const coordinatePattern = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/

  if (!from || !to || !coordinatePattern.test(from) || !coordinatePattern.test(to)) {
    return NextResponse.json({ error: "Coordenadas válidas de origem e destino não foram informadas." }, { status: 400 })
  }

  const routeUrl = `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(from)};${encodeURIComponent(to)}?overview=full&geometries=geojson&steps=false&alternatives=false`
  const response = await fetch(routeUrl, { next: { revalidate: 300 } })
  if (!response.ok) return NextResponse.json({ error: "Serviço de rotas indisponível." }, { status: 502 })

  const data = await response.json()
  const route = data.routes?.[0]
  if (!route?.geometry?.coordinates?.length) {
    return NextResponse.json({ error: "Não foi possível encontrar uma rota entre os endereços." }, { status: 404 })
  }

  return NextResponse.json({
    coordinates: route.geometry.coordinates,
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMin: Math.max(1, Math.round(route.duration / 60)),
  })
}
