'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  addOfficeQrAction,
  createOfficeAction,
  listOfficesWithQr,
  toggleOfficeQrAction,
  updateOfficeAction,
} from '@/app/admin/offices-actions';

type OfficeRow = Awaited<ReturnType<typeof listOfficesWithQr>>[number];

export default function OfficesPanel() {
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    lat: '12.9716',
    lng: '77.5946',
    plusCode: '',
    radiusMeters: '75',
    geofenceM: '150',
  });

  async function load() {
    const rows = await listOfficesWithQr();
    setOffices(rows);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
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
      setError(res.error || 'Failed');
      return;
    }
    setForm((f) => ({ ...f, name: '', address: '' }));
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Offices & QR</h2>
        <p className="text-sm text-brand-300/70">Neon database · mobile QR check-in uses these offices</p>
      </div>
      {error ? <div className="rounded-lg bg-red-500/15 text-red-200 px-3 py-2 text-sm">{error}</div> : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {offices.map((o) => (
            <div key={o.id} className="rounded-xl border border-brand-700/50 bg-brand-950/40 p-4">
              <h3 className="text-white font-semibold">{o.name}</h3>
              <p className="text-xs text-brand-300/70 font-mono mt-1">
                {o.lat}, {o.lng}
                {o.plusCode ? ` · ${o.plusCode}` : ''} · radius {o.radiusMeters}m
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {(o.qrs || []).map((q) => (
                  <div
                    key={q.id}
                    className={`rounded-lg border border-brand-700/40 p-3 text-center ${q.active ? 'bg-white' : 'bg-brand-900/50 opacity-70'}`}
                  >
                    <div className={`font-medium text-sm mb-2 ${q.active ? 'text-slate-900' : 'text-brand-200'}`}>{q.label}</div>
                    {q.active ? (
                      <div className="inline-block p-2 bg-white">
                        <QRCodeSVG value={q.token} size={140} level="M" includeMargin />
                      </div>
                    ) : (
                      <div className="h-[140px] grid place-items-center text-brand-400 text-sm">Inactive</div>
                    )}
                    <p className="text-[10px] break-all mt-2 font-mono text-slate-600">{q.token}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs underline text-brand-600"
                      onClick={async () => {
                        await toggleOfficeQrAction(q.id, !q.active);
                        await load();
                      }}
                    >
                      {q.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-sm px-3 py-1.5 rounded-lg bg-brand-500 text-white"
                onClick={async () => {
                  const label = window.prompt('QR label', 'Entry');
                  if (!label) return;
                  const res = await addOfficeQrAction(o.id, label);
                  if (!res.success) setError(res.error || 'Failed');
                  await load();
                }}
              >
                Add QR
              </button>
              <button
                type="button"
                className="mt-3 ml-2 text-sm px-3 py-1.5 rounded-lg border border-brand-600 text-brand-200"
                onClick={async () => {
                  const lat = window.prompt('Latitude', String(o.lat));
                  const lng = window.prompt('Longitude', String(o.lng));
                  const radius = window.prompt('Radius meters', String(o.radiusMeters));
                  if (!lat || !lng) return;
                  await updateOfficeAction(o.id, {
                    lat: Number(lat),
                    lng: Number(lng),
                    radiusMeters: Number(radius) || o.radiusMeters,
                  });
                  await load();
                }}
              >
                Edit location
              </button>
            </div>
          ))}
          {!offices.length ? <p className="text-brand-300/60 text-sm">No offices yet — create one on the right.</p> : null}
        </div>

        <form onSubmit={onCreate} className="rounded-xl border border-brand-700/50 bg-brand-950/40 p-4 space-y-3 h-fit">
          <h3 className="text-white font-semibold">Add office</h3>
          {(
            [
              ['name', 'Name'],
              ['address', 'Address (optional)'],
              ['lat', 'Latitude'],
              ['lng', 'Longitude'],
              ['plusCode', 'Plus Code (optional)'],
              ['radiusMeters', 'Check-in radius (m)'],
              ['geofenceM', 'Exit geofence (m)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs text-brand-200">
              {label}
              <input
                required={key === 'name' || key === 'lat' || key === 'lng' || key === 'radiusMeters' || key === 'geofenceM'}
                className="mt-1 w-full rounded-lg bg-brand-900/60 border border-brand-700 px-3 py-2 text-sm text-white"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-400 text-white font-medium py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Create office'}
          </button>
        </form>
      </div>
    </div>
  );
}
