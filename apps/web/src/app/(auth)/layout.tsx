export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4 py-12">
      {/* DRC colours accent line */}
      <div className="mb-8 flex w-full max-w-md overflow-hidden rounded-t-xl">
        <div className="h-1 flex-1 bg-[#007FFF]" />
        <div className="h-1 w-10 bg-[#F7D918]" />
        <div className="h-1 flex-1 bg-[#CE1020]" />
      </div>

      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center border-b border-gray-100 px-8 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 shadow-md">
            <span className="text-xl font-black text-white">G</span>
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
            GovSphere
          </p>
        </div>

        <div className="px-8 py-6">{children}</div>
      </div>

      <p className="mt-6 text-center text-xs text-primary-300">
        République Démocratique du Congo · Usage gouvernemental exclusif
      </p>
    </div>
  );
}
