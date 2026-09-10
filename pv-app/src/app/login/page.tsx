import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata = { title: 'Anmelden' }
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="8" fill="#0F5C8C"/>
              <path d="M18 8L28 18L18 28L8 18L18 8Z" fill="none" stroke="#E8A23D" strokeWidth="2.5"/>
              <path d="M12 18L18 12L24 18L18 24L12 18Z" fill="#E8A23D" opacity="0.6"/>
            </svg>
            <div>
              <div className="font-bold text-lg text-[var(--ink)] leading-tight">PV-Stringplaner 2D</div>
              <div className="text-xs text-[var(--ink-faint)]">Photovoltaik-Projektverwaltung</div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--panel)] rounded-[var(--radius)] border border-[var(--line)] p-6 shadow-sm">
          <h1 className="font-bold text-[var(--ink)] text-lg mb-1">Anmelden</h1>
          <p className="text-sm text-[var(--ink-soft)] mb-6">
            Melden Sie sich mit Ihren Zugangsdaten an.
          </p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-[var(--ink-faint)] mt-6">
          Demo: admin@pv-planer.de / demo1234
        </p>
      </div>
    </div>
  )
}
