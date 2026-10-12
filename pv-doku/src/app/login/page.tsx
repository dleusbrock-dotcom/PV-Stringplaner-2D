import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Anmeldung" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ gesperrt?: string }> }) {
  const { gesperrt } = await searchParams;
  return (
    <main className="container narrow" style={{ paddingTop: "8vh" }}>
      <div className="card">
        <h1>PV-Doku – Anmeldung</h1>
        {gesperrt && (
          <div className="alert err" role="alert">
            Ihr Zugang ist (noch) nicht freigeschaltet. Bitte wenden Sie sich an Ihre Administration.
          </div>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
