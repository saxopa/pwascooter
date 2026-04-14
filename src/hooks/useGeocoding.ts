import { useState, useCallback, useRef } from 'react'

interface GeocodingResult {
    lat: number
    lon: number
    display_name: string
}

interface NominatimResult {
    lat: string
    lon: string
    display_name: string
}

interface UseGeocodingReturn {
    suggestions: GeocodingResult[]
    loading: boolean
    search: (query: string) => void
    clear: () => void
}

export function useGeocoding(): UseGeocodingReturn {
    const [suggestions, setSuggestions] = useState<GeocodingResult[]>([])
    const [loading, setLoading] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const search = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (query.length < 3) {
            setSuggestions([])
            return
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams({
                    q: query,
                    format: 'json',
                    addressdetails: '1',
                    limit: '5',
                    countrycodes: 'fr',
                })
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params}`,
                    { headers: { 'Accept-Language': 'fr' } }
                )
                const data = (await res.json()) as NominatimResult[]
                const normalizedResults = data
                    .map((item) => ({
                        lat: Number(item.lat),
                        lon: Number(item.lon),
                        display_name: item.display_name,
                    }))
                    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))

                setSuggestions(normalizedResults)
            } catch {
                setSuggestions([])
            } finally {
                setLoading(false)
            }
        }, 400)
    }, [])

    const clear = useCallback(() => {
        setSuggestions([])
    }, [])

    return { suggestions, loading, search, clear }
}
