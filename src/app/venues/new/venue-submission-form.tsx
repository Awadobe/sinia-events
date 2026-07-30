"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ImagePlus,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Host = { id: string; type: "individual" | "organization"; name: string; slug: string };
type Amenity = { key: string; name: string; category: string };

const steps = ["Venue", "Facilities", "Space & pricing", "Contact & review"];
const eventTypes = [
  "Wedding",
  "Birthday",
  "Corporate event",
  "Workshop",
  "Conference",
  "Private dinner",
];

export function VenueSubmissionForm({
  hosts,
  amenities,
}: {
  hosts: Host[];
  amenities: Amenity[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const groupedAmenities = useMemo(() => {
    return amenities.reduce<Record<string, Amenity[]>>((groups, amenity) => {
      (groups[amenity.category] ||= []).push(amenity);
      return groups;
    }, {});
  }, [amenities]);

  function toggle(value: string, values: string[], update: (next: string[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function selectCover(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0] || null;
    event.target.value = "";
    if (!original) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(original.type)) {
      toast.error("Choose a JPG, PNG, or WebP photograph.");
      return;
    }
    const file = await preparePhoto(original);
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("This photograph is still too large after optimization. Please choose another.");
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function selectGallery(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const supported = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (supported.length !== files.length) toast.error("Some files were skipped. Use JPG, PNG, or WebP photographs.");
    const prepared = await Promise.all(supported.map(preparePhoto));
    const accepted = prepared.filter((file): file is File => file instanceof File && file.size <= 4 * 1024 * 1024);
    if (accepted.length !== supported.length) toast.error("Some photographs were too large to prepare and were skipped.");
    const availableSlots = Math.max(0, 8 - galleryFiles.length);
    const additions = accepted.slice(0, availableSlots);
    if (accepted.length > availableSlots) toast.error("You can add up to 8 gallery photographs.");
    setGalleryFiles((current) => [...current, ...additions]);
    setGalleryPreviews((current) => [...current, ...additions.map((file) => URL.createObjectURL(file))]);
  }

  function removeGalleryPhoto(index: number) {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGalleryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setGalleryPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function validateCurrentStep(form: HTMLFormElement) {
    const fields: Record<number, string[]> = {
      0: ["host_id", "name", "venue_type", "area", "maximum_capacity"],
      1: [],
      2: ["space_name", "space_type"],
      3: ["short_description", "description", "contact_name", "contact_phone"],
    };
    for (const name of fields[step]) {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (field && !field.reportValidity()) return false;
    }
    if (step === 0 && selectedEvents.length === 0) {
      toast.error("Choose at least one type of event the venue accepts.");
      return false;
    }
    return true;
  }

  function next(form: HTMLFormElement) {
    if (!validateCurrentStep(form)) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCurrentStep(event.currentTarget)) return;
    setSubmitting(true);

    const values = new FormData(event.currentTarget);
    values.set("event_types", JSON.stringify(selectedEvents));
    values.set("amenities", JSON.stringify(selectedAmenities));

    const response = await fetch("/api/venues", { method: "POST", body: values });
    const result = await response.json();

    if (!response.ok) {
      setSubmitting(false);
      toast.error(result.error || "The venue could not be submitted.");
      return;
    }

    const photographs = [
      ...(coverFile ? [{ file: coverFile, isCover: true }] : []),
      ...galleryFiles.map((file) => ({ file, isCover: false })),
    ];
    let failedPhotographs = 0;
    for (let index = 0; index < photographs.length; index += 1) {
      const photograph = photographs[index];
      const upload = new FormData();
      upload.set("photo", photograph.file);
      upload.set("is_cover", String(photograph.isCover));
      upload.set("display_order", String(photograph.isCover ? 0 : index));
      const uploadResponse = await fetch(`/api/venues/${result.venue.id}/photos`, {
        method: "POST",
        body: upload,
      });
      if (!uploadResponse.ok) failedPhotographs += 1;
    }
    setSubmitting(false);

    toast.success("Venue submitted for review.");
    if (failedPhotographs > 0) {
      toast.warning(`${failedPhotographs} photograph${failedPhotographs === 1 ? "" : "s"} could not be uploaded. Your venue application was still saved.`);
    }
    router.push(`/venues/submitted?name=${encodeURIComponent(result.venue.name)}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
      <aside className="rounded-[1.5rem] border border-black/5 bg-white p-3 shadow-sm lg:sticky lg:top-5">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={index > step}
            onClick={() => index < step && setStep(index)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
              index === step ? "bg-zinc-900 text-white" : index < step ? "text-zinc-700 hover:bg-zinc-50" : "text-zinc-300"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${index === step ? "bg-white text-zinc-900" : index < step ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50"}`}>
              {index < step ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
        <div className="mt-3 rounded-xl bg-orange-50 p-3 text-xs leading-relaxed text-orange-800">
          <ShieldCheck className="mb-2 h-4 w-4" />
          Nothing becomes public until Radius reviews it.
        </div>
      </aside>

      <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_18px_50px_rgba(60,40,20,0.07)]">
        <div className="border-b border-zinc-100 px-6 py-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            Step {step + 1} of {steps.length}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            {["Tell us about the venue", "What does the venue provide?", "Describe the main space and price", "Who should Radius contact?"][step]}
          </h2>
        </div>

        <div className="p-6 sm:p-8">
          <div className={step === 0 ? "block" : "hidden"}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Who owns or manages this venue?" className="sm:col-span-2">
                <select name="host_id" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Select an account</option>
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.name} · {host.type === "organization" ? "Organization" : "Personal account"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Venue or business name">
                <input name="name" required placeholder="e.g. Oceanview Conference Hall" className={inputClass} />
              </Field>
              <Field label="Venue type">
                <select name="venue_type" required className={inputClass}>
                  <option value="event_hall">Event hall</option>
                  <option value="hotel_event_space">Hotel event space</option>
                  <option value="restaurant_private_space">Restaurant private space</option>
                  <option value="garden_outdoor_venue">Garden or outdoor venue</option>
                  <option value="beach_resort_venue">Beach or resort venue</option>
                  <option value="community_centre">Community or multipurpose centre</option>
                </select>
              </Field>
              <Field label="Area or community">
                <input name="area" required placeholder="e.g. Aberdeen" className={inputClass} />
              </Field>
              <Field label="City">
                <input name="city" defaultValue="Freetown" required className={inputClass} />
              </Field>
              <Field label="Full address or landmark" className="sm:col-span-2">
                <input name="address" placeholder="Help customers find the entrance" className={inputClass} />
              </Field>
              <Field label="Approximate maximum capacity">
                <input name="maximum_capacity" type="number" min="1" required placeholder="e.g. 150" className={inputClass} />
              </Field>
            </div>
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-zinc-700">Events this venue accepts</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {eventTypes.map((item) => (
                  <Choice key={item} active={selectedEvents.includes(item)} onClick={() => toggle(item, selectedEvents, setSelectedEvents)} label={item} />
                ))}
              </div>
            </fieldset>
          </div>

          <div className={step === 1 ? "block" : "hidden"}>
            <p className="mb-5 text-sm leading-relaxed text-zinc-500">
              Choose what customers can expect. Radius can verify these before publication.
            </p>
            <div className="space-y-6">
              {Object.entries(groupedAmenities).map(([category, items]) => (
                <fieldset key={category}>
                  <legend className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-400">{category}</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <Choice key={item.key} active={selectedAmenities.includes(item.key)} onClick={() => toggle(item.key, selectedAmenities, setSelectedAmenities)} label={item.name} />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className={step === 2 ? "block" : "hidden"}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Primary space name">
                <input name="space_name" required placeholder="e.g. Main Celebration Hall" className={inputClass} />
              </Field>
              <Field label="Space type">
                <select name="space_type" required className={inputClass}>
                  <option value="indoor_hall">Indoor hall</option>
                  <option value="outdoor_garden">Outdoor garden</option>
                  <option value="covered_outdoor">Covered outdoor space</option>
                  <option value="conference_room">Conference room</option>
                  <option value="mixed">Mixed indoor and outdoor</option>
                </select>
              </Field>
              <Field label="Theatre-style capacity">
                <input name="theatre_capacity" type="number" min="0" placeholder="Rows facing a stage" className={inputClass} />
              </Field>
              <Field label="Banquet capacity">
                <input name="banquet_capacity" type="number" min="0" placeholder="Guests at dining tables" className={inputClass} />
              </Field>
              <Field label="Classroom capacity">
                <input name="classroom_capacity" type="number" min="0" placeholder="Tables facing forward" className={inputClass} />
              </Field>
              <Field label="Standing capacity">
                <input name="standing_capacity" type="number" min="0" placeholder="Open or cocktail event" className={inputClass} />
              </Field>
              <Field label="Starting price (SLE)">
                <input name="starting_price" type="number" min="0" step="0.01" placeholder="Leave blank if on request" className={inputClass} />
              </Field>
              <Field label="Price basis">
                <select name="price_basis" defaultValue="on_request" className={inputClass}>
                  <option value="on_request">Price on request</option>
                  <option value="per_hour">Per hour</option>
                  <option value="per_session">Per session</option>
                  <option value="per_day">Per day</option>
                  <option value="per_event">Per event</option>
                </select>
              </Field>
              <Field label="What is normally included?" className="sm:col-span-2">
                <textarea name="included_items" rows={3} placeholder="Use a new line for each item, such as chairs, tables, cleaning…" className={inputClass} />
              </Field>
            </div>
          </div>

          <div className={step === 3 ? "block" : "hidden"}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Short introduction" className="sm:col-span-2">
                <input name="short_description" required maxLength={180} placeholder="One sentence customers will see on the venue card" className={inputClass} />
              </Field>
              <Field label="Full venue description" className="sm:col-span-2">
                <textarea name="description" required rows={5} placeholder="Explain what makes the venue useful and what customers should know." className={inputClass} />
              </Field>
              <Field label="Rules and restrictions">
                <textarea name="rules" rows={4} placeholder="One rule per line" className={inputClass} />
              </Field>
              <Field label="Possible additional charges">
                <textarea name="additional_charges" rows={4} placeholder="One charge per line" className={inputClass} />
              </Field>
              <Field label="Authorized contact name">
                <input name="contact_name" required autoComplete="name" className={inputClass} />
              </Field>
              <Field label="Phone or WhatsApp">
                <input name="contact_phone" required type="tel" autoComplete="tel" placeholder="+232…" className={inputClass} />
              </Field>
              <Field label="Contact email">
                <input name="contact_email" type="email" autoComplete="email" className={inputClass} />
              </Field>
              <Field label="YouTube venue-tour link" className="sm:col-span-2">
                <input
                  name="video_url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={inputClass}
                />
                <span className="mt-1.5 block text-xs font-normal leading-relaxed text-zinc-500">
                  Optional. Add a short public or unlisted YouTube walkthrough showing the entrance, event spaces and facilities.
                </span>
              </Field>
              <Field label="Cover photograph">
                <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  <ImagePlus className="h-4 w-4" /> Choose photograph
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectCover} className="hidden" />
                </label>
              </Field>
            </div>
            {coverPreview && (
              <div className="relative mt-5 aspect-[16/7] overflow-hidden rounded-2xl bg-zinc-100">
                <Image src={coverPreview} alt="Selected venue cover" fill unoptimized className="object-cover" />
                <button
                  type="button"
                  aria-label="Remove photograph"
                  onClick={() => { URL.revokeObjectURL(coverPreview); setCoverPreview(null); setCoverFile(null); }}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-700">Venue gallery</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Add up to 8 photographs showing the entrance, event spaces, facilities and surrounding area.
                  </p>
                </div>
                <span className="text-xs font-semibold text-zinc-400">{galleryFiles.length}/8 added</span>
              </div>
              <label className="mt-3 flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange-200 bg-[#fffaf4] text-sm font-semibold text-orange-700 transition hover:border-orange-400 hover:bg-orange-50">
                <ImagePlus className="h-5 w-5" /> Add gallery photographs
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectGallery}
                  className="hidden"
                />
              </label>
              {galleryPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {galleryPreviews.map((preview, index) => (
                    <div key={preview} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                      <Image src={preview} alt={`Venue gallery photograph ${index + 1}`} fill unoptimized className="object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove gallery photograph ${index + 1}`}
                        onClick={() => removeGalleryPhoto(index)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
              <input name="declaration" type="checkbox" required className="mt-1" />
              I confirm that I am authorized to represent this venue and that Radius may review the information and photograph before publication.
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-zinc-100 bg-zinc-50/60 px-6 py-5 sm:px-8">
          <button
            type="button"
            disabled={step === 0 || submitting}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={(event) => next(event.currentTarget.form!)}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Save and continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f06445] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#db5336] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Send for review
            </button>
          )}
        </footer>
      </section>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

async function preparePhoto(file: File) {
  if (file.size <= 2.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return null;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

function Choice({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
        active ? "border-orange-300 bg-orange-50 text-orange-800" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${active ? "bg-orange-500 text-white" : "bg-zinc-100 text-transparent"}`}>
        <Check className="h-3.5 w-3.5" />
      </span>
      {label}
    </button>
  );
}
