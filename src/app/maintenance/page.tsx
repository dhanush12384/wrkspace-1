export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <section className="w-full max-w-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-semibold">Maintenance Mode</p>
        <h1 className="mt-3 text-3xl font-bold">wrkspace is temporarily unavailable</h1>
        <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
          We are applying scheduled updates. Please check back in a few minutes.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Live APIs, health checks, static assets and internal monitoring remain active.
        </p>
      </section>
    </main>
  );
}
