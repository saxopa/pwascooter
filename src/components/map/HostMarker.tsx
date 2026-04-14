/* eslint-disable react-refresh/only-export-components */
import { memo, useMemo, useState, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Tables } from '../../types/supabase'

type Host = Tables<'hosts'>

// ─── Icon cache ───────────────────────────────────────────────
let standardMarkerIcon: L.DivIcon | null = null
let chargingMarkerIcon: L.DivIcon | null = null
let userMarkerIcon: L.DivIcon | null = null

export function createMarkerIcon(hasCharging: boolean): L.DivIcon {
    if (hasCharging && chargingMarkerIcon) return chargingMarkerIcon
    if (!hasCharging && standardMarkerIcon) return standardMarkerIcon

    const iconSymbol = hasCharging
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L6 13H11L10 22L18 10H13V2Z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C16 17.8 19 14.4 19 10.5C19 6.36 15.87 3 12 3C8.13 3 5 6.36 5 10.5C5 14.4 8 17.8 12 22Z"/><circle cx="12" cy="10" r="2.6" fill="#6C5CE7"/></svg>'

    const iconHtml = `
        <div style="
            width:40px;height:40px;border-radius:50%;
            background:${hasCharging ? 'linear-gradient(135deg, #6C5CE7, #00CEC9)' : 'linear-gradient(135deg, #6C5CE7, #A29BFE)'};
            display:flex;align-items:center;justify-content:center;
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 4px 15px rgba(108,92,231,0.5);
        ">
            <span style="display:flex;align-items:center;justify-content:center;">${iconSymbol}</span>
        </div>
    `

    const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -42],
    })

    if (hasCharging) chargingMarkerIcon = icon
    else standardMarkerIcon = icon

    return icon
}

export function getUserMarkerIcon(): L.DivIcon {
    if (userMarkerIcon) return userMarkerIcon

    const iconHtml = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
            <div style="position:absolute;width:28px;height:28px;background:rgba(0,122,255,0.4);border-radius:50%;animation:marker-pulse 2s ease-in-out infinite;"></div>
            <div style="position:relative;width:14px;height:14px;border-radius:50%;background:#007AFF;border:2.5px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>
        </div>
    `

    userMarkerIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    })

    return userMarkerIcon
}

// ─── User location marker (GPS isolated) ─────────────────────
export function UserLocationMarker() {
    const [position, setPosition] = useState<[number, number] | null>(null)

    useEffect(() => {
        if (!navigator.geolocation) return
        let lastUpdate = 0
        const MIN_UPDATE_INTERVAL = 3000

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now()
                if (now - lastUpdate >= MIN_UPDATE_INTERVAL) {
                    setPosition([pos.coords.latitude, pos.coords.longitude])
                    lastUpdate = now
                }
            },
            () => { /* ignore */ },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        )
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])

    if (!position) return null
    return <Marker position={position} icon={getUserMarkerIcon()} zIndexOffset={100} />
}

// ─── Memoized host marker ─────────────────────────────────────
const HostMarker = memo(function HostMarker({
    host,
    onSelect,
}: {
    host: Host
    onSelect: (host: Host) => void
}) {
    const handlers = useMemo(() => ({
        click: () => onSelect(host),
    }), [host, onSelect])

    return (
        <Marker
            position={[host.latitude, host.longitude]}
            icon={createMarkerIcon(host.has_charging ?? false)}
            eventHandlers={handlers}
        >
            <Popup>
                <strong>{host.name}</strong>
                <br />
                {Number(host.price_per_hour).toFixed(2)} €/h
            </Popup>
        </Marker>
    )
})

export default HostMarker
