const COUNTRY_FLAGS: Record<string, string> = {
    India: '🇮🇳',
    USA: '🇺🇸',
    'United States': '🇺🇸',
    UAE: '🇦🇪',
    'United Arab Emirates': '🇦🇪',
    UK: '🇬🇧',
    'United Kingdom': '🇬🇧',
    Germany: '🇩🇪',
    Singapore: '🇸🇬',
    China: '🇨🇳',
    Japan: '🇯🇵',
    Australia: '🇦🇺',
    'South Africa': '🇿🇦',
    Brazil: '🇧🇷',
    Turkey: '🇹🇷',
    Netherlands: '🇳🇱',
    'South Korea': '🇰🇷',
    'Korea': '🇰🇷',
    Mexico: '🇲🇽',
    France: '🇫🇷',
    Italy: '🇮🇹',
    Spain: '🇪🇸',
    Canada: '🇨🇦',
    Malaysia: '🇲🇾',
    Thailand: '🇹🇭',
    Vietnam: '🇻🇳',
    Indonesia: '🇮🇩',
    Philippines: '🇵🇭',
    'Saudi Arabia': '🇸🇦',
    Egypt: '🇪🇬',
    Nigeria: '🇳🇬',
    Kenya: '🇰🇪',
    Bangladesh: '🇧🇩',
    Pakistan: '🇵🇰',
    'Sri Lanka': '🇱🇰',
    Nepal: '🇳🇵',
}

interface CountryFlagProps {
    country: string
    className?: string
}

export function CountryFlag({ country, className }: CountryFlagProps) {
    const normalized = (country ?? '').trim()
    const direct = COUNTRY_FLAGS[normalized]
    if (direct) return <span className={className} role="img" aria-label={country}>{direct}</span>
    const found = Object.entries(COUNTRY_FLAGS).find(
        ([k]) => k.toLowerCase() === normalized.toLowerCase()
    )
    const flag = found ? found[1] : '🌍'
    return <span className={className} role="img" aria-label={country}>{flag}</span>
}
