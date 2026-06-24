export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-navy-900 px-4 py-12">
      {/* Auth card */}
      <div className="w-full max-w-[420px] bg-white shadow-dialog">
        {/* DRC brand stripe — identity marker at top of card */}
        <div className="drc-stripe">
          <div className="stripe-blue" />
          <div className="stripe-gold" />
          <div className="stripe-red" />
        </div>

        {/* Logo block */}
        <div className="flex flex-col items-center border-b border-slate-100 px-8 py-6">
          <div className="flex h-10 w-10 items-center justify-center bg-primary-600">
            <span className="text-lg font-black text-white leading-none">G</span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            GovSphere
          </p>
        </div>

        {/* Page content */}
        <div className="px-8 py-7">{children}</div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-navy-500">
        République Démocratique du Congo · Usage gouvernemental exclusif
      </p>
    </div>
  );
}
