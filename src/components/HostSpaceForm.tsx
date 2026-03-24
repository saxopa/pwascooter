import { useState } from 'react'
import {
    ArrowLeft,
    MapPin,
    Save,
    Loader2,
    Zap,
    Package,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useGeocoding } from '../hooks/useGeocoding'
import { useHostProfile } from '../hooks/useHostProfile'
import type { Tables, TablesInsert, TablesUpdate } from '../types/supabase'

type Host = Tables<'hosts'>

interface HostSpaceFormProps {
    space: Host | null
    onSaved: () => void
    onCancel: () => void
}

export default function HostSpaceForm({ space, onSaved, onCancel }: HostSpaceFormProps) {
    const { user } = useHostProfile()
    const { suggestions, loading: geoLoading, search, clear } = useGeocoding()

    const [name, setName] = useState(space?.name ?? '')
    const [address, setAddress] = useState('')
    const [latitude, setLatitude] = useState(space?.latitude ?? 0)
    const [longitude, setLongitude] = useState(space?.longitude ?? 0)
    const [capacity, setCapacity] = useState(space?.capacity ?? 1)
    const [pricePerHour, setPricePerHour] = useState(space ? Number(space.price_per_hour) : 1.5)
    const [hasCharging, setHasCharging] = useState(space?.has_charging ?? false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [coordsSet, setCoordsSet] = useState(!!space)

    function handleAddressChange(value: string) {
        setAddress(value)
        setCoordsSet(false)
        search(value)
    }

    function selectSuggestion(s: { lat: number; lon: number; display_name: string }) {
        setAddress(s.display_name)
        setLatitude(s.lat)
        setLongitude(s.lon)
        setCoordsSet(true)
        clear()
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!user) return
        setError(null)

        if (!name.trim()) { setError('Le nom est requis.'); return }
        if (!coordsSet && !space) { setError('Sélectionne une adresse dans les suggestions.'); return }
        if (capacity < 1) { setError('La capacité doit être d\'au moins 1.'); return }
        if (pricePerHour <= 0) { setError('Le prix doit être supérieur à 0.'); return }

        setSaving(true)

        const payload: TablesInsert<'hosts'> = {
            name: name.trim(),
            latitude,
            longitude,
            capacity,
            price_per_hour: pricePerHour,
            has_charging: hasCharging,
            owner_id: user.id,
        }

        if (space) {
            const updatePayload: TablesUpdate<'hosts'> = coordsSet
                ? payload
                : { ...payload, latitude: space.latitude, longitude: space.longitude }

            const { error: err } = await supabase
                .from('hosts')
                .update(updatePayload)
                .eq('id', space.id)

            if (err) { setError(err.message); setSaving(false); return }
        } else {
            const { error: err } = await supabase
                .from('hosts')
                .insert(payload)

            if (err) { setError(err.message); setSaving(false); return }
        }

        setSaving(false)
        onSaved()
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-primary)',
        fontSize: '0.95rem',
        outline: 'none',
        fontFamily: 'var(--font-sans)',
    }

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.82rem',
        color: 'var(--color-text-secondary)',
        fontWeight: 600,
        marginBottom: 6,
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    paddingTop: 'max(20px, env(safe-area-inset-top))',
                    background: 'linear-gradient(to bottom, rgba(15,15,26,0.98), rgba(15,15,26,0.85))',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    position: 'sticky', top: 0, zIndex: 10,
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                <button
                    onClick={onCancel}
                    aria-label="Retour"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%', width: 38, height: 38,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--color-text-primary)', flexShrink: 0,
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    {space ? 'Modifier la place' : 'Nouvelle place'}
                </h1>
            </div>

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                style={{ flex: 1, padding: '24px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 18 }}
            >
                {/* Name */}
                <div>
                    <label style={labelStyle}>
                        <MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Nom de l'endroit
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="ex: Parking Capitole"
                        required
                        style={inputStyle}
                    />
                </div>

                {/* Address with geocoding */}
                <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>📍 Adresse</label>
                    <input
                        type="text"
                        value={address}
                        onChange={e => handleAddressChange(e.target.value)}
                        placeholder={space ? 'Laisser vide pour conserver l\'adresse actuelle' : 'Taper une adresse à Toulouse…'}
                        style={inputStyle}
                    />
                    {geoLoading && (
                        <Loader2 size={16} style={{
                            position: 'absolute', right: 12, top: 38,
                            animation: 'spin 1s linear infinite', color: 'var(--color-primary-light)',
                        }} />
                    )}
                    {suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute', left: 0, right: 0, top: '100%',
                            background: 'var(--color-bg-card)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 'var(--radius-sm)',
                            maxHeight: 200, overflowY: 'auto', zIndex: 20,
                            marginTop: 4,
                        }}>
                            {suggestions.map((s, i) => (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => selectSuggestion(s)}
                                    style={{
                                        width: '100%', padding: '10px 14px',
                                        background: 'transparent', border: 'none',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '0.82rem', textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                    }}
                                >
                                    {s.display_name}
                                </button>
                            ))}
                        </div>
                    )}
                    {coordsSet && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: 4 }}>
                            ✓ Coordonnées : {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                        </p>
                    )}
                </div>

                {/* Capacity & Price row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={labelStyle}>
                            <Package size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Capacité
                        </label>
                        <input
                            type="number"
                            value={capacity}
                            onChange={e => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                            min={1}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>💰 Prix par heure (€)</label>
                        <input
                            type="number"
                            value={pricePerHour}
                            onChange={e => setPricePerHour(Math.max(0, parseFloat(e.target.value) || 0))}
                            min={0.5}
                            step={0.5}
                            required
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* Charging toggle */}
                <button
                    type="button"
                    onClick={() => setHasCharging(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 16px',
                        background: hasCharging ? 'rgba(0,206,201,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${hasCharging ? 'rgba(0,206,201,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 'var(--radius-md)',
                        color: hasCharging ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                >
                    <Zap size={18} />
                    Recharge électrique disponible
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700 }}>
                        {hasCharging ? 'OUI' : 'NON'}
                    </span>
                </button>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(255,107,107,0.15)',
                        border: '1px solid rgba(255,107,107,0.25)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-danger)', fontSize: '0.85rem',
                    }}>
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                    style={{
                        width: '100%', marginTop: 'auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: saving ? 0.7 : 1,
                        cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? (
                        <><Loader2 size={17} style={{ animation: 'spin 0.6s linear infinite' }} /> Enregistrement…</>
                    ) : (
                        <><Save size={17} /> {space ? 'Enregistrer les modifications' : 'Créer la place'}</>
                    )}
                </button>
            </form>
        </div>
    )
}
