import { useCallback } from 'react'
import { translations } from './translations'
import type { Locale } from './translations'

export function useTranslation(locale: Locale) {
    const t = useCallback(
        <S extends keyof typeof translations['pt-BR'], K extends keyof typeof translations['pt-BR'][S]>(
            section: S,
            key: K
        ): string => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (translations[locale][section] as any)[key] as string
        },
        [locale]
    )

    return { t }
}
