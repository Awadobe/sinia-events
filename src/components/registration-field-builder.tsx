"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { REGISTRATION_FIELD_TYPES, type RegistrationField, type RegistrationFieldType } from "@/lib/registration-fields";

export function RegistrationFieldBuilder({ fields, onChange }: { fields: RegistrationField[]; onChange: (fields: RegistrationField[]) => void }) {
  const update = (index: number, patch: Partial<RegistrationField>) => onChange(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  const add = () => onChange([...fields, { id: crypto.randomUUID(), label: "", type: "short_text", required: false }]);
  const remove = (index: number) => onChange(fields.filter((_, fieldIndex) => fieldIndex !== index));

  return <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-zinc-900">Registration questions</h3><p className="mt-1 text-xs leading-relaxed text-zinc-500">Name and email are always collected. Add any other information you need.</p></div><button type="button" onClick={add} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Add question</button></div>
    {fields.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center text-sm text-zinc-400">No custom questions. Attendees will enter only their name and email.</div> : <div className="mt-5 space-y-3">{fields.map((field, index) => {
      const hasOptions = ["select", "radio", "multi_select"].includes(field.type);
      return <div key={field.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
        <div className="flex items-start gap-3"><GripVertical className="mt-3 h-4 w-4 shrink-0 text-zinc-300" /><div className="min-w-0 flex-1 space-y-3"><input value={field.label} onChange={(event) => update(index, { label: event.target.value })} placeholder="Write your question" className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" /><div className="grid gap-3 sm:grid-cols-2"><select value={field.type} onChange={(event) => update(index, { type: event.target.value as RegistrationFieldType, options: ["select", "radio", "multi_select"].includes(event.target.value) ? (field.options?.length ? field.options : ["Option 1", "Option 2"]) : undefined })} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none"><option value="" disabled>Question type</option>{REGISTRATION_FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><input value={field.description || ""} onChange={(event) => update(index, { description: event.target.value })} placeholder="Help text (optional)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none" /></div>{hasOptions && <textarea value={(field.options || []).join("\n")} onChange={(event) => update(index, { options: event.target.value.split("\n") })} rows={3} placeholder={'One option per line\nOption 1\nOption 2'} className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none" />}<label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600"><input type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} className="h-4 w-4 rounded border-zinc-300 accent-orange-500" /> Required question</label></div><button type="button" onClick={() => remove(index)} title="Remove question" className="mt-2 rounded-lg p-2 text-zinc-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div>
      </div>;
    })}</div>}
  </div>;
}
