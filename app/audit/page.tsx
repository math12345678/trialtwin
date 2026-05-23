import { AuditTable } from "@/components/audit/AuditTable";

export default function AuditPage() {
  return (
    <div className="mx-auto max-w-tt-container px-6 md:px-12 py-10">
      <div className="label-eyebrow text-tt-faint mb-3">Audit evidence base</div>
      <h1 className="display-h2 mb-2">98 NCCN-cited RCC studies</h1>
      <p className="text-tt-muted text-[14px] mb-8 max-w-[680px]">
        The simulation engine is calibrated against the participant composition
        of these published studies. Filter, sort, and inspect each. Race-usable
        rate is the single largest data gap surfaced by the audit.
      </p>
      <AuditTable />
    </div>
  );
}
