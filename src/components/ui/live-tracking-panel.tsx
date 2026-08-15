'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
type EmpRow = {
    id: string;
    name: string;
    email: string;
    phone: string;
    wingName?: string;
    lat: number | null;
    lng: number | null;
    lastLocationAt?: string | null;
    ageMs?: number | null;
    isLive: boolean;
    hasLocation: boolean;
    liveTrackActive: boolean;
    mapsUrl?: string | null;
};
const LiveMap = dynamic(() => import('./live-tracking-map').then((m) => m.LiveTrackingMap), {
    ssr: false,
    loading: () => (<div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading map…</div>),
});
function ageLabel(ageMs: number | null | undefined) {
    if (ageMs == null || ageMs < 0)
        return 'never';
    if (ageMs < 60000)
        return `${Math.round(ageMs / 1000)}s ago`;
    if (ageMs < 3600000)
        return `${Math.round(ageMs / 60000)}m ago`;
    if (ageMs < 86400000)
        return `${Math.round(ageMs / 3600000)}h ago`;
    return `${Math.round(ageMs / 86400000)}d ago`;
}
export function AdminLiveTrackingPanel({ adminEmail }: {
    adminEmail: string;
}) {
    const [employees, setEmployees] = useState<EmpRow[]>([]);
    const [globalActive, setGlobalActive] = useState(false);
    const [stats, setStats] = useState({ total: 0, withLocation: 0, live: 0, personalActive: 0 });
    const [busy, setBusy] = useState(false);
    const [rowBusy, setRowBusy] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [lastAt, setLastAt] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'live' | 'located' | 'tracking'>('all');
    const [q, setQ] = useState('');
    const [focusId, setFocusId] = useState<string | null>(null);
    const load = async () => {
        if (!adminEmail)
            return;
        try {
            const email = encodeURIComponent(adminEmail);
            const res = await fetch(`/api/admin/live-tracking?email=${email}&_=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'x-admin-email': adminEmail },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(data?.error || `Load failed (${res.status})`);
            setEmployees(Array.isArray(data.employees) ? data.employees : []);
            setGlobalActive(Boolean(data.global?.active));
            setStats(data.stats || { total: 0, withLocation: 0, live: 0, personalActive: 0 });
            setLastAt(new Date().toLocaleTimeString());
            setError('');
        }
        catch (e: any) {
            setError(String(e?.message || e));
        }
    };
    const postAction = async (action: 'start_all' | 'stop_all' | 'start_one' | 'stop_one', employeeId?: string) => {
        const res = await fetch('/api/admin/live-tracking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-email': adminEmail,
            },
            body: JSON.stringify({ email: adminEmail, action, employeeId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
            throw new Error(data?.error || 'Action failed');
        await load();
    };
    useEffect(() => {
        if (!adminEmail)
            return;
        void load();
        const id = window.setInterval(() => void load(), 5000);
        return () => window.clearInterval(id);
    }, [adminEmail]);
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return employees.filter((e) => {
            if (filter === 'live' && !e.isLive)
                return false;
            if (filter === 'located' && !e.hasLocation)
                return false;
            if (filter === 'tracking' && !(e.liveTrackActive || globalActive))
                return false;
            if (!needle)
                return true;
            return (e.name.toLowerCase().includes(needle) ||
                e.phone.toLowerCase().includes(needle) ||
                e.email.toLowerCase().includes(needle) ||
                e.id.toLowerCase().includes(needle));
        });
    }, [employees, filter, q, globalActive]);
    const mapEmployees = employees.filter((e) => e.hasLocation);
    return (<div className="space-y-6 text-slate-800">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
				<div>
					<h2 className="text-xl font-bold text-slate-900">Live tracking</h2>
					<p className="mt-1 max-w-xl text-xs text-slate-500 leading-relaxed">
						Pins are each employee&apos;s phone GPS (not the office). Click a name to zoom to their
						exact pin. Green = updated in last 5 min. Track requires their wrkspace app open with
						location allowed.
						{lastAt ? ` · Refreshed ${lastAt}` : ''}
					</p>
					{error ? <p className="mt-1 text-xs text-rose-600 font-semibold">{error}</p> : null}
				</div>
				<div className="flex flex-wrap gap-2">
					{!globalActive ? (<button type="button" disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                    await postAction('start_all');
                }
                catch (e: any) {
                    setError(String(e?.message || e));
                }
                finally {
                    setBusy(false);
                }
            }} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-light shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50">
							{busy ? '…' : 'Start live tracking'}
						</button>) : (<button type="button" disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                    await postAction('stop_all');
                }
                catch (e: any) {
                    setError(String(e?.message || e));
                }
                finally {
                    setBusy(false);
                }
            }} className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 text-xs font-light shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50">
							{busy ? '…' : 'Stop live tracking'}
						</button>)}
					<button type="button" onClick={() => void load()} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-light text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer">
						Refresh
					</button>
				</div>
			</div>

			<div className={`rounded-xl border px-4 py-3 text-xs shadow-sm ${globalActive
            ? 'border-emerald-250 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 bg-white text-slate-700'}`}>
				<p className="font-bold">
					Global tracking: {globalActive ? 'ON — phones pinging' : 'OFF'}
				</p>
				<p className="mt-1 text-xs opacity-90 font-medium">
					{stats.live} live now · {stats.withLocation} have a last location · {stats.personalActive}{' '}
					personal track · {stats.total} employees
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
				<div className="h-[450px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
					<LiveMap employees={mapEmployees} focusId={focusId}/>
				</div>

				<div className="flex h-[450px] flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
					<div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 p-3 items-center">
						<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone…" className="min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"/>
						{([
            ['all', 'All'],
            ['live', 'Live'],
            ['located', 'Located'],
            ['tracking', 'Tracking'],
        ] as const).map(([id, label]) => (<button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-light transition-all ${filter === id
                ? 'bg-brand-650 text-white shadow-sm cursor-pointer'
                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 shadow-xs cursor-pointer'}`}>
								{label}
							</button>))}
					</div>
					<ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
						{filtered.length === 0 ? (<li className="p-4 text-center text-xs text-slate-500 italic">No employees match.</li>) : (filtered.map((e) => (<li key={e.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
									<div className="flex items-start gap-2">
										<button type="button" className="min-w-0 flex-1 text-left" onClick={() => setFocusId(e.id === focusId ? null : e.id)}>
											<div className="flex items-center gap-2">
												<span className={`inline-block size-2 shrink-0 rounded-full ${e.isLive
                ? 'bg-emerald-500'
                : e.hasLocation
                    ? 'bg-slate-400'
                    : 'bg-slate-200'}`}/>
												<p className="truncate text-xs font-semibold text-slate-800">{e.name}</p>
												{e.liveTrackActive ? (<span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[8px] font-bold text-emerald-800">
														TRACKING
													</span>) : null}
											</div>
											<p className="mt-0.5 text-[10px] text-slate-500 font-normal">{e.phone}</p>
											<p className="mt-0.5 text-[10px] text-slate-500 font-normal">
												{e.hasLocation
                ? `${e.lat!.toFixed(5)}, ${e.lng!.toFixed(5)} · ${ageLabel(e.ageMs)}${(e as any).nearOfficeName
                    ? ` · near ${(e as any).nearOfficeName}`
                    : ''}`
                : 'No location yet — open app + allow GPS'}
											</p>
										</button>
										<div className="flex shrink-0 flex-col gap-1.5">
											{e.mapsUrl ? (<a href={e.mapsUrl} target="_blank" rel="noreferrer" onClick={(ev) => {
                    ev.stopPropagation();
                    if (e.lat != null && e.lng != null) {
                        ev.preventDefault();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`, '_blank', 'noopener,noreferrer');
                    }
                }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center text-[10px] font-light text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer">
													Maps
												</a>) : null}
											{e.liveTrackActive ? (<button type="button" disabled={rowBusy === e.id} onClick={async () => {
                    setRowBusy(e.id);
                    try {
                        await postAction('stop_one', e.id);
                    }
                    catch (err: any) {
                        setError(String(err?.message || err));
                    }
                    finally {
                        setRowBusy(null);
                    }
                }} className="rounded-lg bg-rose-605 hover:bg-rose-500 text-white px-2.5 py-1.5 text-center text-[10px] font-light shadow-sm cursor-pointer transition-colors active:scale-[0.98] disabled:opacity-50">
													Stop
												</button>) : (<button type="button" disabled={rowBusy === e.id} onClick={async () => {
                    setRowBusy(e.id);
                    try {
                        await postAction('start_one', e.id);
                        setFocusId(e.id);
                    }
                    catch (err: any) {
                        setError(String(err?.message || err));
                    }
                    finally {
                        setRowBusy(null);
                    }
                }} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 text-center text-[10px] font-light shadow-sm cursor-pointer transition-colors active:scale-[0.98] disabled:opacity-50">
													Track
												</button>)}
										</div>
									</div>
								</li>)))}
					</ul>
				</div>
			</div>
		</div>);
}
