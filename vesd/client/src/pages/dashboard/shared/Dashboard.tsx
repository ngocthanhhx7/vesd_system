export function Dashboard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-brand">VESD workspace</p>
          <h1 className="text-4xl font-black">{title}</h1>
        </div>
        <div className="hidden rounded-full bg-white px-4 py-2 text-base font-semibold text-brand shadow-sm md:block">Escrow-ready marketplace</div>
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-2xl font-black">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
