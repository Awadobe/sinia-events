export const REGISTRATION_FIELD_TYPES = [
  { value: "short_text", label: "Short answer" },
  { value: "long_text", label: "Long answer" },
  { value: "phone", label: "Phone number" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Single choice" },
  { value: "checkbox", label: "Yes / No checkbox" },
  { value: "multi_select", label: "Multiple choice" },
] as const;

export type RegistrationFieldType = typeof REGISTRATION_FIELD_TYPES[number]["value"];

export type RegistrationField = {
  id: string;
  label: string;
  type: RegistrationFieldType;
  required: boolean;
  description?: string;
  options?: string[];
};

export type RegistrationAnswers = Record<string, string | number | boolean | string[]>;

export function sanitizeRegistrationFields(value: unknown): RegistrationField[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 25).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const type = REGISTRATION_FIELD_TYPES.some((entry) => entry.value === source.type)
      ? source.type as RegistrationFieldType
      : "short_text";
    const label = String(source.label || "").trim().slice(0, 160);
    if (!label) return [];
    const needsOptions = ["select", "radio", "multi_select"].includes(type);
    const options = needsOptions && Array.isArray(source.options)
      ? source.options.map((option) => String(option).trim().slice(0, 100)).filter(Boolean).slice(0, 20)
      : undefined;
    return [{
      id: String(source.id || crypto.randomUUID()).slice(0, 80),
      label,
      type,
      required: Boolean(source.required),
      description: String(source.description || "").trim().slice(0, 240) || undefined,
      options,
    }];
  });
}

export function validateRegistrationAnswers(fields: RegistrationField[], value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const answers: RegistrationAnswers = {};
  for (const field of fields) {
    const raw = source[field.id];
    const empty = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0) || raw === false;
    if (field.required && empty) return { error: `${field.label} is required.`, answers: null };
    if (empty) continue;
    if (field.type === "multi_select") {
      const selected = Array.isArray(raw) ? raw.map(String).filter((answer) => field.options?.includes(answer)) : [];
      if (field.required && !selected.length) return { error: `${field.label} is required.`, answers: null };
      answers[field.id] = selected;
    } else if (field.type === "checkbox") {
      answers[field.id] = Boolean(raw);
    } else if (field.type === "number") {
      const number = Number(raw);
      if (!Number.isFinite(number)) return { error: `${field.label} must be a number.`, answers: null };
      answers[field.id] = number;
    } else {
      const answer = String(raw).trim().slice(0, 2000);
      if (["select", "radio"].includes(field.type) && !field.options?.includes(answer)) return { error: `Select a valid answer for ${field.label}.`, answers: null };
      answers[field.id] = answer;
    }
  }
  return { error: null, answers };
}
