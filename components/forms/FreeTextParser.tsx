"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { ArrowRight } from "lucide-react";

const PLACEHOLDER = `e.g. Phase III RCC trial enrolling 600 patients across US, Germany, France, UK, Canada, Australia, Japan. Adults 18–80, prior treatment required.`;

export function FreeTextParser() {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedFields, setParsedFields] = useState<string[]>([]);
  const applyParsed = useStore((s) => s.applyParsed);

  async function onParse() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const result = await api.parseText(text);
      applyParsed(result);
      const fields: string[] = [];
      if (result.target_n) fields.push("target_n");
      if (result.min_age) fields.push("age_range");
      if (result.sex_restriction) fields.push("sex_restriction");
      if (result.prior_treatment_required) fields.push("prior_treatment");
      if (result.countries?.length) fields.push("countries");
      setParsedFields(fields);
    } catch (e) {
      console.error(e);
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="tt-card-alt mb-8">
      <div className="label-eyebrow text-tt-faint mb-2">
        ◐  Quick start · paste a trial description
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        className="tt-input min-h-[80px] resize-y font-body text-[14px]"
      />
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="text-[12px] text-tt-muted">
          Rules-based parser · runs locally · no LLM dependency
        </div>
        <button
          className="tt-btn tt-btn-primary"
          onClick={onParse}
          disabled={parsing || !text.trim()}
        >
          {parsing ? "Parsing…" : "Parse"}
          {!parsing && <ArrowRight size={14} />}
        </button>
      </div>
      {parsedFields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {parsedFields.map((f) => (
            <span
              key={f}
              className="font-mono text-[10px] uppercase tracking-widest bg-tt-accent text-white px-2 py-[2px]"
            >
              auto · {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
