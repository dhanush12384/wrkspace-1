'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { encodePlusCode, googleMapsPinUrl, googleMapsSearchUrl, parseMapsLocation } from '@/lib/maps-geo';
import { setEmployeeHomeLocation } from '@/app/admin/actions';

const MapTap = dynamic(() => import('./home-map-tap'), { ssr: false, loading: () => <div className="h-64 bg-slate-100 animate-pulse" /> });

type Props = {
	employee: any;
	onSaved?: (employee: any) => void;
};

export function HomeLocationPicker({ employee, onSaved }: Props) {
	const isFemale = String(employee?.gender || '').toUpperCase() === 'FEMALE';
	const hasHome = employee?.homeLat != null && employee?.homeLng != null;
	const canEdit = !hasHome || employee?.homeEditAllowed !== false;
	const [lat, setLat] = useState<number | null>(employee?.homeLat ?? null);
	const [lng, setLng] = useState<number | null>(employee?.homeLng ?? null);
	const [plus, setPlus] = useState(String(employee?.homePlusCode || ''));
	const [address, setAddress] = useState(String(employee?.homeAddress || ''));
	const [paste, setPaste] = useState('');
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);

	useEffect(() => {
		setLat(employee?.homeLat ?? null);
		setLng(employee?.homeLng ?? null);
		setPlus(String(employee?.homePlusCode || ''));
		setAddress(String(employee?.homeAddress || ''));
	}, [employee?.id, employee?.homeLat, employee?.homeLng, employee?.homePlusCode, employee?.homeAddress]);

	const setPoint = (nextLat: number, nextLng: number, label?: string) => {
		const code = encodePlusCode(nextLat, nextLng);
		setLat(nextLat);
		setLng(nextLng);
		setPlus(code);
		setErr(null);
		if (label) setAddress(label);
	};

	const useGps = () => {
		setBusy(true);
		setErr(null);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setPoint(pos.coords.latitude, pos.coords.longitude, 'Current GPS location');
				setBusy(false);
			},
			() => {
				setBusy(false);
				setErr('Allow location permission in the browser to use current GPS.');
			},
			{ enableHighAccuracy: true, timeout: 20000 }
		);
	};

	const applyPaste = () => {
		const parsed = parseMapsLocation(paste);
		if (!parsed) {
			setErr('Paste a Google Maps link or coordinates like 12.97,77.59');
			return;
		}
		setPoint(parsed.lat, parsed.lng, 'From Google Maps');
		setMsg('Location loaded from Maps link. Review the pin, then Save.');
	};

	const save = async () => {
		if (lat == null || lng == null) {
			setErr('Pick a point first (GPS, map tap, or paste a Maps link).');
			return;
		}
		setBusy(true);
		setErr(null);
		setMsg(null);
		const res = await setEmployeeHomeLocation(employee.id, {
			lat,
			lng,
			plusCode: plus || encodePlusCode(lat, lng),
			address: address || null,
		});
		setBusy(false);
		if (res.success && res.employee) {
			setMsg('Home location saved. It is locked now — admin must allow any future change.');
			onSaved?.(res.employee);
		} else {
			setErr(res.error || 'Failed to save');
		}
	};

	const mapsHref = useMemo(() => {
		if (lat != null && lng != null) return googleMapsSearchUrl(lat, lng);
		return googleMapsSearchUrl();
	}, [lat, lng]);

	if (!isFemale) {
		return (
			<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-xl shadow-xs">
				<p className="text-sm text-slate-500 dark:text-zinc-400">Home location setup is part of Girl Safety (female employees).</p>
			</div>
		);
	}

	
	if (hasHome && !canEdit) {
		return (
			<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-xl shadow-xs space-y-3">
				<h2 className="text-lg font-black text-slate-900 dark:text-white">Home location</h2>
				<p className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
					<span className="inline-block size-2 rounded-full bg-emerald-500" />
					Saved — one-time setup complete.
				</p>
				{employee.homePlusCode ? (
					<p className="text-sm font-mono text-slate-700 dark:text-zinc-300">Plus Code: {employee.homePlusCode}</p>
				) : null}
				<p className="text-xs font-mono text-slate-500 dark:text-zinc-400">
					{Number(employee.homeLat).toFixed(6)}, {Number(employee.homeLng).toFixed(6)}
				</p>
				{employee.homeAddress ? <p className="text-sm text-slate-600 dark:text-zinc-400">{employee.homeAddress}</p> : null}
				<p className="text-xs text-slate-500 dark:text-zinc-500 pt-1 leading-relaxed">
					To change this pin, ask admin to click the yellow <strong>Allow home setup</strong> on your employee row.
				</p>
				<a
					href={googleMapsPinUrl(Number(employee.homeLat), Number(employee.homeLng))}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center justify-center rounded-md border border-black/[0.1] dark:border-white/[0.1] bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 no-underline transition-colors cursor-pointer"
				>
					View pin in Maps
				</a>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 rounded-xl shadow-xs space-y-4">
			<div>
				<h2 className="text-lg font-black text-slate-900 dark:text-white">Home location</h2>
				<p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
					Set once for going-home tracking. After you save, it locks until admin allows a change.
					Use GPS, tap the map, or paste a Google Maps link.
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={useGps}
					disabled={busy}
					className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer disabled:opacity-50"
				>
					{busy ? 'Working…' : 'Use current GPS'}
				</button>
				<a
					href={mapsHref}
					target="_blank"
					rel="noreferrer"
					className="bg-slate-800 dark:bg-zinc-800 hover:bg-slate-700 dark:hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2 rounded-md inline-flex items-center no-underline transition-colors cursor-pointer"
				>
					Open Google Maps
				</a>
				{lat != null && lng != null && (
					<a
						href={googleMapsPinUrl(lat, lng)}
						target="_blank"
						rel="noreferrer"
						className="border border-black/[0.1] dark:border-white/[0.1] bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 text-xs font-bold px-4 py-2 rounded-md no-underline transition-colors cursor-pointer"
					>
						Verify pin in Maps
					</a>
				)}
			</div>

			<div className="space-y-1">
				<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">Paste Google Maps link or lat,lng</label>
				<div className="flex gap-2">
					<input
						value={paste}
						onChange={(e) => setPaste(e.target.value)}
						placeholder="https://maps.google.com/... or 12.9716,77.5946"
						className="flex-1 border border-black/[0.1] dark:border-white/[0.1] bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/40"
					/>
					<button 
						type="button" 
						onClick={applyPaste} 
						className="bg-slate-800 dark:bg-zinc-800 hover:bg-slate-700 dark:hover:bg-zinc-700 text-white text-xs font-bold px-4 rounded-md transition-colors cursor-pointer"
					>
						Apply
					</button>
				</div>
			</div>

			<div className="border border-black/[0.08] dark:border-white/[0.08] rounded-lg overflow-hidden h-64">
				<MapTap lat={lat} lng={lng} onPick={setPoint} />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="space-y-1">
					<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">Plus Code (auto)</label>
					<input
						value={plus}
						readOnly
						className="w-full border border-black/[0.1] dark:border-white/[0.1] bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono text-slate-700 dark:text-zinc-300 rounded-md outline-none"
					/>
				</div>
				<div className="space-y-1">
					<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">Note (optional)</label>
					<input
						value={address}
						onChange={(e) => setAddress(e.target.value)}
						placeholder="Apartment / landmark"
						className="w-full border border-black/[0.1] dark:border-white/[0.1] bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/40"
					/>
				</div>
			</div>

			{lat != null && lng != null && (
				<p className="text-xs font-mono text-slate-500 dark:text-zinc-400">
					{lat.toFixed(6)}, {lng.toFixed(6)}
				</p>
			)}

			{err && <p className="text-xs font-semibold text-[#E61E32]">{err}</p>}
			{msg && <p className="text-xs font-semibold text-emerald-600">{msg}</p>}

			<button
				type="button"
				disabled={busy || lat == null}
				onClick={save}
				className="w-full bg-[#E61E32] hover:bg-[#c9182a] text-white font-bold py-3 px-6 rounded-md transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 text-center text-sm"
			>
				{busy ? 'Saving…' : hasHome ? 'Update home location' : 'Save home location'}
			</button>
		</div>
	);
}
