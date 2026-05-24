export function Dashboard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-brand">Không gian VESD</p>
          <h1 className="text-4xl font-black">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children, columns = 'auto' }: { title: string; children: React.ReactNode; columns?: 'auto' | 'form' }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-2xl font-black">{title}</h2>
      <div className={columns === 'form' ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'}>{children}</div>
    </section>
  );
}
