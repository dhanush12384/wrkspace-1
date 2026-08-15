'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';
import {
	addOfficeQrAction,
	createOfficeAction,
	deleteOfficeAction,
	deleteOfficeQrAction,
	listOfficesWithQr,
	toggleOfficeQrAction,
	updateOfficeAction,
} from '@/app/admin/offices-actions';
import { encodePlusCode, googleMapsPinUrl, googleMapsSearchUrl, parseMapsLocation } from '@/lib/maps-geo';
import { BuildingIcon, MapPinIcon, QrCodeIcon, PlusIcon, Trash2Icon, PencilIcon, ExternalLinkIcon, NavigationIcon, CompassIcon, CheckCircleIcon, AlertCircleIcon, RefreshCwIcon, RadioIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MapTap = dynamic(() => import('./home-map-tap'), {
	ssr: false,
	loading: () => <div className="h-56 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-medium">Loading interactive map…</div>,
});

type OfficeRow = Awaited<ReturnType<typeof listOfficesWithQr>>[number];

export default function OfficesPanel() {
	const [offices, setOffices] = useState<OfficeRow[]>([]);
	const [error, setError] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(true);
	const [mapsPaste, setMapsPaste] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({
		name: '',
		address: '',
		lat: '12.9716',
		lng: '77.5946',
		plusCode: '',
		radiusMeters: '300',
		geofenceM: '300',
	});

	const latNum = Number(form.lat);
	const lngNum = Number(form.lng);

	async function load(isSilent = false) {
		if (!isSilent) setLoading(true);
		try {
			const rows = await listOfficesWithQr();
			setOffices(rows);
		} catch (e: any) {
			setError(String(e?.message || e));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load().catch((e) => setError(String(e)));
	}, []);

	function setPoint(lat: number, lng: number) {
		setForm((f) => ({
			...f,
			lat: String(lat),
			lng: String(lng),
			plusCode: encodePlusCode(lat, lng) || f.plusCode,
		}));
		setError('');
	}

	function useGps() {
		if (!navigator.geolocation) {
			setError('Geolocation not available in this browser');
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setPoint(pos.coords.latitude, pos.coords.longitude);
				setSuccessMsg('GPS location captured successfully');
				setTimeout(() => setSuccessMsg(''), 3000);
			},
			() => setError('Allow location permission to use GPS'),
			{ enableHighAccuracy: true }
		);
	}

	function applyMapsPaste() {
		const parsed = parseMapsLocation(mapsPaste);
		if (!parsed) {
			setError('Paste a valid Google Maps link or coordinates like 12.97,77.59');
			return;
		}
		setPoint(parsed.lat, parsed.lng);
		setSuccessMsg('Coordinates extracted from link');
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	function applyPlusCode() {
		const raw = form.plusCode.trim();
		if (!raw.includes('+')) {
			setError('Plus Code must look like 7J4V+2Q (with a +)');
			return;
		}
		try {
			const { OpenLocationCode } = require('open-location-code') as {
				OpenLocationCode: new () => {
					isValid: (c: string) => boolean;
					isFull: (c: string) => boolean;
					decode: (c: string) => { latitudeCenter: number; longitudeCenter: number };
					recoverNearest: (c: string, lat: number, lng: number) => string;
				};
			};
			const coder = new OpenLocationCode();
			const code = raw.toUpperCase();
			if (!coder.isValid(code)) {
				setError('Invalid Plus Code');
				return;
			}
			let full = code;
			if (!coder.isFull(code)) {
				full = coder.recoverNearest(code, Number.isFinite(latNum) ? latNum : 12.9716, Number.isFinite(lngNum) ? lngNum : 77.5946);
			}
			const d = coder.decode(full);
			setPoint(d.latitudeCenter, d.longitudeCenter);
			setForm((f) => ({ ...f, plusCode: full }));
			setSuccessMsg('Plus Code resolved to coordinates');
			setTimeout(() => setSuccessMsg(''), 3000);
		} catch {
			setError('Could not decode Plus Code — use map tap or GPS instead');
		}
	}

	async function onCreate(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError('');
		setSuccessMsg('');
		const res = await createOfficeAction({
			name: form.name,
			address: form.address,
			lat: Number(form.lat),
			lng: Number(form.lng),
			plusCode: form.plusCode || null,
			radiusMeters: Number(form.radiusMeters),
			geofenceM: Number(form.geofenceM),
		});
		setBusy(false);
		if (!res.success) {
			setError(res.error || 'Failed to create office');
			return;
		}
		setEditingId(null);
		setForm((f) => ({ ...f, name: '', address: '', plusCode: encodePlusCode(Number(f.lat), Number(f.lng)) }));
		setSuccessMsg('New office location added successfully');
		setTimeout(() => setSuccessMsg(''), 4000);
		await load(true);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Offices & Geofencing</h2>
					<p className="text-xs text-slate-500 mt-0.5">
						Manage branch locations, GPS coordinates, check-in radius boundaries, and generate branch QR codes
					</p>
				</div>
				<button
					type="button"
					onClick={() => void load()}
					className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all rounded-xl cursor-pointer shadow-2xs self-start sm:self-auto"
					title="Refresh Offices"
				>
					<RefreshCwIcon className="size-4" />
				</button>
			</div>

			{/* Status Toasts */}
			{error && (
				<div className="p-3.5 rounded-xl text-xs flex items-center gap-2 border bg-rose-50 text-rose-800 border-rose-200 shadow-2xs">
					<AlertCircleIcon className="size-4 text-rose-600 shrink-0" />
					<span>{error}</span>
				</div>
			)}
			{successMsg && (
				<div className="p-3.5 rounded-xl text-xs flex items-center gap-2 border bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs">
					<CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
					<span>{successMsg}</span>
				</div>
			)}

			<div className="grid lg:grid-cols-12 gap-6 items-start">
				{/* Left Column: Office List & QR Codes */}
				<div className="lg:col-span-7 space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
							Configured Locations ({offices.length})
						</h3>
					</div>

					{loading ? (
						<div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
							<div className="size-10 border-3 border-[#E61E32]/20 border-t-[#E61E32] rounded-full animate-spin mx-auto mb-3" />
							<p className="text-sm font-medium text-slate-600">Loading office locations...</p>
						</div>
					) : offices.length === 0 ? (
						<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
							<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
								<BuildingIcon className="size-6" />
							</div>
							<h4 className="text-sm font-semibold text-slate-800">No Offices Configured</h4>
							<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
								Use the form on the right to drop a pin on the map and configure your first physical branch location.
							</p>
						</div>
					) : (
						offices.map((o) => (
							<div
								key={o.id}
								className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
							>
								{/* Office Card Header */}
								<div className="flex items-start justify-between gap-3">
									<div className="space-y-1 min-w-0">
										<div className="flex items-center gap-2">
											<div className="p-1.5 rounded-lg bg-red-50 text-[#E61E32] border border-red-100">
												<BuildingIcon className="size-4" />
											</div>
											<h4 className="font-semibold text-slate-900 text-sm">{o.name}</h4>
										</div>

										{o.address && (
											<p className="text-xs text-slate-600 pl-8">{o.address}</p>
										)}

										{/* Meta badges */}
										<div className="flex items-center flex-wrap gap-2 pt-1 pl-8 text-xs">
											<span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
												{o.lat}, {o.lng}
											</span>
											{o.plusCode && (
												<span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
													{o.plusCode}
												</span>
											)}
											<span className="inline-flex items-center gap-1 font-medium text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
												<RadioIcon className="size-3 text-emerald-600" />
												Radius: {o.radiusMeters}m
											</span>
										</div>
									</div>

									{/* Delete Office Button - Solid Red */}
									<button
										type="button"
										className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all shadow-2xs shrink-0"
										style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
										onClick={async () => {
											if (!confirm(`Delete office "${o.name}" and all its associated QR codes?`)) return;
											const res = await deleteOfficeAction(o.id);
											if (!res.success) setError(res.error || 'Delete failed');
											else setSuccessMsg(`Office "${o.name}" deleted`);
											await load(true);
										}}
									>
										<Trash2Icon className="size-3.5 text-white" /> Delete
									</button>
								</div>

								{/* Google Maps link */}
								<div className="pl-8">
									<a
										href={googleMapsPinUrl(o.lat, o.lng)}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
									>
										<ExternalLinkIcon className="size-3" />
										Open in Google Maps
									</a>
								</div>

								{/* QR Codes Grid */}
								<div className="pt-2 border-t border-slate-100">
									<div className="flex items-center justify-between mb-3">
										<p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
											<QrCodeIcon className="size-3.5 text-slate-400" />
											Check-in QR Codes ({(o.qrs || []).length})
										</p>
										<button
											type="button"
											className="inline-flex items-center gap-1 text-xs font-semibold text-[#E61E32] hover:text-[#c9182a] cursor-pointer"
											onClick={async () => {
												const label = window.prompt('Enter QR label (e.g. Main Entrance, Reception, Floor 2)', 'Main Entrance');
												if (!label) return;
												const res = await addOfficeQrAction(o.id, label);
												if (!res.success) setError(res.error || 'Failed to add QR');
												else setSuccessMsg(`QR "${label}" generated`);
												await load(true);
											}}
										>
											<PlusIcon className="size-3.5" />
											Add QR Code
										</button>
									</div>

									{(o.qrs || []).length === 0 ? (
										<p className="text-xs text-slate-400 italic py-2">No QR codes generated for this office yet.</p>
									) : (
										<div className="grid sm:grid-cols-2 gap-3">
											{(o.qrs || []).map((q) => (
												<div
													key={q.id}
													className={cn(
														"rounded-xl border p-4 text-center space-y-2 transition-all",
														q.active 
															? "bg-white border-slate-200 shadow-2xs" 
															: "bg-slate-50 border-slate-200/60 opacity-60"
													)}
												>
													<div className="flex items-center justify-between">
														<span className="font-semibold text-xs text-slate-900">{q.label}</span>
														<span className={cn(
															"text-[10px] font-medium px-2 py-0.5 rounded-full border",
															q.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
														)}>
															{q.active ? 'Active' : 'Disabled'}
														</span>
													</div>

													{q.active ? (
														<div className="p-2.5 bg-white border border-slate-100 rounded-xl inline-block shadow-2xs">
															<QRCodeSVG value={q.token} size={130} level="M" includeMargin />
														</div>
													) : (
														<div className="h-[130px] grid place-items-center text-slate-400 text-xs italic">
															QR Inactive
														</div>
													)}

													<p className="text-[10px] font-mono text-slate-400 break-all truncate" title={q.token}>
														{q.token}
													</p>

													<div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-100">
														<button
															type="button"
															className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
															onClick={async () => {
																await toggleOfficeQrAction(q.id, !q.active);
																await load(true);
															}}
														>
															{q.active ? 'Deactivate' : 'Activate'}
														</button>
														<button
															type="button"
															className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
															onClick={async () => {
																if (!confirm(`Delete QR "${q.label}"?`)) return;
																const res = await deleteOfficeQrAction(q.id);
																if (!res.success) setError(res.error || 'Failed');
																else setSuccessMsg('QR code removed');
																await load(true);
															}}
														>
															Delete
														</button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>

								{/* Action Bar */}
								<div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
									<button
										type="button"
										className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs transition-all"
										onClick={() => {
											setEditingId(o.id);
											setForm({
												name: o.name,
												address: o.address || '',
												lat: String(o.lat),
												lng: String(o.lng),
												plusCode: o.plusCode || encodePlusCode(o.lat, o.lng),
												radiusMeters: String(o.radiusMeters),
												geofenceM: String(o.geofenceM),
											});
											setError('');
											document.getElementById('office-form')?.scrollIntoView({ behavior: 'smooth' });
										}}
									>
										<PencilIcon className="size-3.5 text-slate-400" />
										Edit on Map
									</button>
								</div>
							</div>
						))
					)}
				</div>

				{/* Right Column: Office Location Editor / Form */}
				<div className="lg:col-span-5">
					<form
						id="office-form"
						onSubmit={onCreate}
						className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4 sticky top-6"
					>
						<div className="border-b border-slate-100 pb-3">
							<h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
								<MapPinIcon className="size-4 text-[#E61E32]" />
								{editingId ? 'Edit Office Location' : 'Add New Branch Office'}
							</h3>
							<p className="text-xs text-slate-500 mt-0.5">
								{editingId ? 'Update coordinates and boundary settings for this location.' : 'Pick location using GPS, Google Maps, or tap directly on the map.'}
							</p>
						</div>

						{editingId && (
							<div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
								Editing selected office. Save changes below or cancel to create a new one.
							</div>
						)}

						<div className="space-y-1">
							<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Office / Branch Name</label>
							<input
								required
								placeholder="e.g. Hyderabad Headquarters, Bangalore Tech Park"
								className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>

						<div className="space-y-1">
							<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Address (Optional)</label>
							<input
								placeholder="Street address, floor, or landmark"
								className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
								value={form.address}
								onChange={(e) => setForm({ ...form, address: e.target.value })}
							/>
						</div>

						{/* Quick Location Tools */}
						<div className="space-y-2 pt-1">
							<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">Location Helpers</label>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={useGps}
									className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-[#E61E32] hover:bg-[#c9182a] text-white rounded-xl cursor-pointer transition-all shadow-xs"
								>
									<NavigationIcon className="size-3.5" />
									Use Current GPS
								</button>
								<a
									href={
										Number.isFinite(latNum) && Number.isFinite(lngNum)
											? googleMapsSearchUrl(latNum, lngNum)
											: googleMapsSearchUrl()
									}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
								>
									<ExternalLinkIcon className="size-3.5" />
									Search on Maps
								</a>
							</div>
						</div>

						{/* Paste Google Maps link */}
						<div className="space-y-1">
							<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Paste Maps Link or Coordinates</label>
							<div className="flex gap-2">
								<input
									className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
									placeholder="https://maps.google.com/... or 12.97,77.59"
									value={mapsPaste}
									onChange={(e) => setMapsPaste(e.target.value)}
								/>
								<button
									type="button"
									onClick={applyMapsPaste}
									className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs"
								>
									Extract
								</button>
							</div>
						</div>

						{/* Interactive Map Picker */}
						<div className="space-y-1">
							<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Map Pin (Click to Set)</label>
							<div className="border border-slate-200 overflow-hidden h-56 rounded-xl shadow-2xs">
								{Number.isFinite(latNum) && Number.isFinite(lngNum) ? (
									<MapTap lat={latNum} lng={lngNum} onPick={setPoint} />
								) : (
									<MapTap lat={12.9716} lng={77.5946} onPick={setPoint} />
								)}
							</div>
							<p className="text-[10px] text-slate-400 mt-1">Tap or click any spot on the map above to drop the office pin.</p>
						</div>

						{/* Plus Code */}
						<div className="space-y-1">
							<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Plus Code</label>
							<div className="flex gap-2">
								<input
									className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
									value={form.plusCode}
									onChange={(e) => setForm({ ...form, plusCode: e.target.value })}
									placeholder="e.g. 7J4V+2Q"
								/>
								<button
									type="button"
									onClick={applyPlusCode}
									className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors"
								>
									Resolve
								</button>
							</div>
						</div>

						{/* Coordinates */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Latitude</label>
								<input
									required
									className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
									value={form.lat}
									onChange={(e) => setForm({ ...form, lat: e.target.value })}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Longitude</label>
								<input
									required
									className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
									value={form.lng}
									onChange={(e) => setForm({ ...form, lng: e.target.value })}
								/>
							</div>
						</div>

						{/* Radius Controls */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Check-in Radius (m)</label>
								<input
									required
									className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
									value={form.radiusMeters}
									onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Exit Buffer (m)</label>
								<input
									required
									className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
									value={form.geofenceM}
									onChange={(e) => setForm({ ...form, geofenceM: e.target.value })}
								/>
							</div>
						</div>

						{/* Submit / Save Buttons */}
						{editingId ? (
							<div className="space-y-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									disabled={busy}
									className="w-full rounded-xl bg-[#E61E32] hover:bg-[#c9182a] text-white font-semibold py-2.5 text-xs disabled:opacity-50 cursor-pointer shadow-xs transition-all"
									onClick={async () => {
										setBusy(true);
										setError('');
										const res = await updateOfficeAction(editingId, {
											name: form.name,
											address: form.address,
											lat: Number(form.lat),
											lng: Number(form.lng),
											plusCode: form.plusCode || null,
											radiusMeters: Number(form.radiusMeters),
											geofenceM: Number(form.geofenceM),
										});
										setBusy(false);
										if (!res.success) setError(res.error || 'Update failed');
										else {
											setEditingId(null);
											setSuccessMsg('Office location updated');
											setTimeout(() => setSuccessMsg(''), 4000);
											await load(true);
										}
									}}
								>
									{busy ? 'Saving…' : 'Save Changes'}
								</button>
								<button
									type="button"
									className="w-full text-xs text-slate-500 hover:text-slate-800 font-medium py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
									onClick={() => {
										setEditingId(null);
										setForm((f) => ({ ...f, name: '', address: '' }));
									}}
								>
									Cancel Edit
								</button>
							</div>
						) : (
							<div className="pt-2 border-t border-slate-100">
								<button
									type="submit"
									disabled={busy}
									className="w-full rounded-xl bg-[#E61E32] hover:bg-[#c9182a] text-white font-semibold py-2.5 text-xs disabled:opacity-50 cursor-pointer shadow-xs transition-all"
								>
									{busy ? 'Saving…' : 'Create Office Location'}
								</button>
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	);
}
