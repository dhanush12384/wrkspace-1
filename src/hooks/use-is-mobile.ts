'use client';
import { useEffect, useState } from 'react';
const MOBILE_MQ = '(max-width: 767px)';
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    useEffect(() => {
        try {
            setIsMobile(window.matchMedia(MOBILE_MQ).matches);
        }
        catch {
            setIsMobile(false);
        }
    }, []);
    return isMobile;
}
