"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type Site = {
  id: string;
  name: string;
  schedulerMode: string;
  autoIntervalMin: number;
  weekSlots: string;
  allowedTypes: string;
};

export function SettingsForm({ sites, locale }: { sites: Site[]; locale: Locale }) {
  const copy = t(locale);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const site = sites.find((row) => row.id === siteId);
  const [mode, setMode] = useState(site?.schedulerMode ?? "off");
  const [interval, setInterval] = useState(site?.autoIntervalMin ?? 60);
  const [types, setTypes] = useState(site?.allowedTypes ?? "post,page");
  const [slots, setSlots] = useState(site?.weekSlots ?? "{}");
  const [message, setMessage] = useState("");

  if (!site) {
    return <p className="text-sm text-ink-soft">{copy.settingsNoSite}</p>;
  }

  return (
    <form
      className="mt-6 max-w-xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        let weekSlots: Record<string, string[]> = {};
        try {
          weekSlots = JSON.parse(slots) as Record<string, string[]>;
        } catch {
          setMessage(copy.weekSlotsJson);
          return;
        }
        const response = await fetch(`/api/v1/sites/${site.id}/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedulerMode: mode,
            autoIntervalMin: interval,
            allowedTypes: types,
            weekSlots,
          }),
        });
        setMessage(response.ok ? copy.saved : copy.workspaceSaveError);
      }}
    >
      <label className="block text-sm">
        {copy.siteLabel}
        <select
          className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2"
          value={siteId}
          onChange={(event) => {
            const next = sites.find((row) => row.id === event.target.value);
            setSiteId(event.target.value);
            if (next) {
              setMode(next.schedulerMode);
              setInterval(next.autoIntervalMin);
              setTypes(next.allowedTypes);
              setSlots(next.weekSlots);
            }
          }}
        >
          {sites.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {copy.schedulerMode}
        <select className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="off">{copy.schedulerOff}</option>
          <option value="auto">{copy.schedulerAuto}</option>
          <option value="manual">{copy.schedulerManual}</option>
        </select>
      </label>
      <label className="block text-sm">
        {copy.intervalMinutes}
        <input type="number" min={15} className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2" value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
      </label>
      <label className="block text-sm">
        {copy.postTypes}
        <input className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2" value={types} onChange={(e) => setTypes(e.target.value)} />
      </label>
      <label className="block text-sm">
        {copy.weekSlotsHint} {'{"1":["09:00","14:00"]}'}
        <textarea className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 font-mono text-xs" rows={5} value={slots} onChange={(e) => setSlots(e.target.value)} />
      </label>
      <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">
        {copy.save}
      </button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
