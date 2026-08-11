

export type MemberChatColor = {
	
	bg: string;
	
	fg: string;
	
	soft: string;
	
	accent: string;
};





export const CHAT_MEMBER_PALETTE = [
	'#8232E6', 
	'#068D7F', 
	'#C8D93A', 
	'#DB2777', 
	'#2563EB', 
	'#16A34A', 
	'#EA580C', 
	'#9333EA', 
	'#0891B2', 
	'#E11D48', 
	'#4F46E5', 
	'#65A30D', 
	'#C026D3', 
	'#0284C7', 
	'#D97706', 
	'#7C3AED', 
] as const;

function hashId(id: string): number {
	let h = 0;
	const s = String(id || 'unknown');
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) >>> 0;
	}
	return h;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const h = hex.replace('#', '');
	const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}


function luminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	const lin = [r, g, b].map((c) => {
		const x = c / 255;
		return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function withAlpha(hex: string, alpha: number): string {
	const { r, g, b } = hexToRgb(hex);
	return `rgba(${r},${g},${b},${alpha})`;
}




export function memberChatColor(idOrName: string | null | undefined): MemberChatColor {
	const key = String(idOrName || 'unknown').trim() || 'unknown';
	const bg = CHAT_MEMBER_PALETTE[hashId(key) % CHAT_MEMBER_PALETTE.length];
	const fg = luminance(bg) > 0.45 ? '#0F172A' : '#FFFFFF';
	return {
		bg,
		fg,
		soft: withAlpha(bg, 0.35),
		accent: bg,
	};
}

export function memberInitials(name: string | null | undefined): string {
	const parts = String(name || '?')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
