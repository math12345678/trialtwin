"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AuditStudy } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { ChevronDown, ChevronUp } from "lucide-react";

type SortKey = "year" | "n" | "title_abbrev" | "journal" | "design";

export function AuditTable() {
  const [studies, setStudies] = useState<AuditStudy[]>([]);
  const [filterJournal, setFilterJournal] = useState<string>("");
  const [filterDesign, setFilterDesign] = useState<string>("");
  const [filterRace, setFilterRace] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .auditData()
      .then((data) => {
        setStudies(data.studies);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const journals = useMemo(
    () => Array.from(new Set(studies.map((s) => s.journal))).sort(),
    [studies]
  );
  const designs = useMemo(
    () => Array.from(new Set(studies.map((s) => s.design))).sort(),
    [studies]
  );

  const filtered = useMemo(() => {
    let out = [...studies];
    if (filterJournal) out = out.filter((s) => s.journal === filterJournal);
    if (filterDesign) out = out.filter((s) => s.design === filterDesign);
    if (filterRace === "yes") out = out.filter((s) => s.race_usable);
    if (filterRace === "no") out = out.filter((s) => !s.race_usable);

    out.sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return out;
  }, [studies, filterJournal, filterDesign, filterRace, sortKey, sortAsc]);

  const totalN = useMemo(() => filtered.reduce((a, b) => a + (b.n ?? 0), 0), [filtered]);
  const racePct = useMemo(() => {
    if (filtered.length === 0) return 0;
    return filtered.filter((s) => s.race_usable).length / filtered.length;
  }, [filtered]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  }

  return (
    <div>
      <div className="bg-tt-bg-alt border border-tt-border p-4 font-mono text-[11px] flex items-center justify-between mb-6">
        <div>
          Showing <span className="text-tt-text">{fmtInt(filtered.length)}</span> of{" "}
          <span className="text-tt-text">{fmtInt(studies.length)}</span> studies ·{" "}
          <span className="text-tt-text">{fmtInt(totalN)}</span> total participants
        </div>
        <div>
          <span className="text-tt-faint uppercase tracking-widest">Race usable</span>
          <span className="ml-2 text-tt-text">{(racePct * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 font-mono text-[11px]">
        <select
          className="tt-input !w-auto !py-2"
          value={filterJournal}
          onChange={(e) => setFilterJournal(e.target.value)}
        >
          <option value="">All journals</option>
          {journals.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <select
          className="tt-input !w-auto !py-2"
          value={filterDesign}
          onChange={(e) => setFilterDesign(e.target.value)}
        >
          <option value="">All designs</option>
          {designs.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="tt-input !w-auto !py-2"
          value={filterRace}
          onChange={(e) => setFilterRace(e.target.value)}
        >
          <option value="">Race: any</option>
          <option value="yes">Race usable</option>
          <option value="no">Race NOT usable</option>
        </select>
      </div>

      <div className="border border-tt-border overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-tt-bg-alt">
            <tr>
              <Th label="Title" k="title_abbrev" sortKey={sortKey} sortAsc={sortAsc} onClick={toggleSort} />
              <Th label="Year" k="year" sortKey={sortKey} sortAsc={sortAsc} onClick={toggleSort} />
              <Th label="Journal" k="journal" sortKey={sortKey} sortAsc={sortAsc} onClick={toggleSort} />
              <Th label="Design" k="design" sortKey={sortKey} sortAsc={sortAsc} onClick={toggleSort} />
              <Th label="N" k="n" sortKey={sortKey} sortAsc={sortAsc} onClick={toggleSort} />
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] tracking-widest text-tt-faint">
                Regions
              </th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] tracking-widest text-tt-faint">
                Sex
              </th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] tracking-widest text-tt-faint">
                Race
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-4 font-mono text-[11px] text-tt-muted">
                  Loading studies…
                </td>
              </tr>
            )}
            {filtered.map((s, i) => (
              <Fragment key={s.id}>
                <tr
                  className={`border-t border-tt-border cursor-pointer ${
                    i % 2 ? "bg-tt-bg-alt" : "bg-white"
                  } hover:bg-tt-bg-alt`}
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <td className="px-3 py-2 font-medium">{s.title_abbrev}</td>
                  <td className="px-3 py-2 mono-num">{s.year}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.journal}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-tt-muted">{s.design}</td>
                  <td className="px-3 py-2 mono-num">{fmtInt(s.n)}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-tt-muted">
                    {s.regions.length}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {s.sex_usable ? "✓" : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {s.race_usable ? (
                      <span className="text-tt-ok">✓</span>
                    ) : (
                      <span className="text-tt-risk">—</span>
                    )}
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr className="border-t border-tt-border bg-tt-bg-alt">
                    <td colSpan={8} className="p-4">
                      <div className="grid md:grid-cols-3 gap-4 text-[12px]">
                        <KV k="ID" v={s.id} />
                        <KV k="Region (primary)" v={s.region_primary} />
                        <KV
                          k="Sex distribution"
                          v={
                            s.sex_male_pct != null
                              ? `${(s.sex_male_pct * 100).toFixed(0)}% male`
                              : "not reported"
                          }
                        />
                        <KV k="Age median" v={s.age_median ? `${s.age_median} yr` : "—"} />
                        <KV k="Countries" v={s.countries.join(" · ") || "—"} />
                        <KV k="All regions" v={s.regions.join(" · ") || "—"} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortAsc,
  onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onClick(k)}
      className="px-3 py-2 text-left font-mono uppercase text-[10px] tracking-widest text-tt-faint cursor-pointer hover:text-tt-text"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
      </span>
    </th>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-mono uppercase text-[9px] tracking-widest text-tt-faint">{k}</div>
      <div className="text-[13px]">{v}</div>
    </div>
  );
}
