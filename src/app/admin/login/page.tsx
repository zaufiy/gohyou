"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    setBusy(false);
    if (res.ok) router.push("/admin"); else setError((await res.json()).error ?? "Gagal login");
  }
  const cls = "min-h-11 w-full rounded-xl border border-steam bg-surface px-3";
  return (
    <main className="mx-auto max-w-sm space-y-4 p-5">
      <h1 className="text-3xl font-extrabold">Login Operator</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className={cls} type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={cls} type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
        <Button full disabled={busy} type="submit">{busy ? "Masuk..." : "Masuk"}</Button>
      </form>
    </main>
  );
}
