// src/mobile/pages/Register.tsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// keep your existing service imports
import { registerUser } from "../../shared/services/userService";
import { getSchools, getProgrammes, getDepartments } from "../../shared/services/optionService";

import { INTERESTS } from "../../shared/constants/interests";
import { auth } from "../../shared/utils/firebase";

import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImageFile } from "../../shared/utils/cropper";
import Portal from "../../shared/components/portal";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { createLucideIcon } from "lucide-react";

// ✅ add uploadAvatar (same helper you use on Profile page)
import { uploadAvatar } from "../../shared/api";

// ------------ icons (converted from the Android VectorDrawable you shared) ------------
const MaleIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M9.5 11c1.93 0 3.5 1.57 3.5 3.5S11.43 18 9.5 18 6 16.43 6 14.5 7.57 11 9.5 11zm0-2C6.46 9 4 11.46 4 14.5S6.46 20 9.5 20s5.5-2.46 5.5-5.5c0-1.16-.36-2.23-.97-3.12L18 7.42V10h2V4h-6v2h2.58l-3.97 3.97c-.88-.61-1.95-.97-3.14-.97z"
      fill={active ? "#FF5069" : "#FFFFFF"}
    />
  </svg>
);

const FemaleIcon = ({ active }: { active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M17.5 9.5C17.5 6.46 15.04 4 12 4S6.5 6.46 6.5 9.5c0 2.7 1.94 4.93 4.5 5.4V17H9v2h2v2h2v-2h2v-2h-2v-2.1c2.56-.47 4.5-2.7 4.5-5.4zM8.5 9.5C8.5 7.57 10.07 6 12 6s3.5 1.57 3.5 3.5S13.93 13 12 13 8.5 11.43 8.5 9.5z"
      fill={active ? "#FF5069" : "#FFFFFF"}
    />
  </svg>
);

// ------------ FeedMobile's bottom sheet bits (unchanged styling) ------------
export const DashWide = createLucideIcon("DashWide", [["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }]]);

const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 40 },
  },
  exit: {
    y: "100%",
    transition: { type: "spring", stiffness: 380, damping: 40 },
  },
};

// ------------ small helpers ------------
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function toDateString(y: number, m: number, d: number) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

async function compressImage(file: File, maxKB = 300): Promise<File> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // keep things reasonable (like we did on profile page)
  const maxDim = 800;
  let { width, height } = img;
  if (Math.max(width, height) > maxDim) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high" as any;
  ctx.drawImage(img, 0, 0, width, height);

  let q = 0.9;
  while (true) {
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), "image/jpeg", q));
    if (blob.size / 1024 <= maxKB || q <= 0.2) {
      return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    }
    q -= 0.1;
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// “What are you looking for” → number
const LOOKING_FOR_OPTIONS: { id: number; label: string }[] = [
  { id: 0, label: "Dating and vibing" },
  { id: 1, label: "Long-term commitment" },
  { id: 2, label: "Something casual" },
  { id: 3, label: "I’m not sure" },
];

// types
type OptionItem = { id: number; name: string };

// ------------ DOB Wheel (simple scroll “picker”) ------------
const ITEM_H = 40;
const VIEW_H = 200; // matches className h-[200px]
const CENTER_OFFSET = (VIEW_H - ITEM_H) / 2; // 80px center band

function Wheel({ options, value, onChange, ariaLabel }: { options: (string | number)[]; value: string | number | null; onChange: (v: string | number) => void; ariaLabel: string; }) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Scroll the selected item under the center band
  React.useEffect(() => {
    if (value == null || !ref.current) return;
    const idx = options.findIndex((o) => String(o) === String(value));
    if (idx >= 0) {
      const top = Math.max(0, idx * ITEM_H - CENTER_OFFSET);
      ref.current.scrollTo({ top, behavior: "smooth" });
    }
  }, [value, options]);

  // Pick the item currently under the center band
  const onScroll = React.useCallback(() => {
    if (!ref.current) return;
    const top = ref.current.scrollTop;
    const idx = clamp(Math.round((top + CENTER_OFFSET) / ITEM_H), 0, options.length - 1);
    const v = options[idx];
    if (String(v) !== String(value ?? "")) onChange(v);
  }, [value, options, onChange]);

  return (
    <div
      aria-label={ariaLabel}
      ref={ref}
      onScroll={onScroll}
      className="relative h-[12.5rem] w-full overflow-y-scroll scrollbar-none snap-y snap-mandatory"
      style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}
    >
      {/* selection band centered */}
      <div
        className="pointer-events-none absolute left-0 right-0 border-y"
        style={{ top: CENTER_OFFSET, height: ITEM_H, borderColor: "#FFFFFF33" }}
      />
      {options.map((o) => (
        <div key={String(o)} className="flex items-center justify-center snap-start" style={{ height: ITEM_H }} onClick={() => onChange(o)}>
          <span className={`text-xl ${String(o) === String(value ?? "__none__") ? "text-white" : "text-white/40"}`}>
            {o}
          </span>
        </div>
      ))}
    </div>
  );
}

// ------------ The wizard ------------
export default function Register() {
  // step index: 0..5
  const [step, setStep] = useState<number>(0);

  // prefill name/email from Firebase (read-only on first page)
  const displayName = auth.currentUser?.displayName ?? "";
  const email = auth.currentUser?.email ?? "";

  const [schools, setSchools] = useState<OptionItem[]>([]);
  const [programmes, setProgrammes] = useState<OptionItem[]>([]);
  const [departments, setDepartments] = useState<OptionItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ keep the real File to upload after registration
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // ✅ blocking overlay state + lottie container
  const [blocking, setBlocking] = useState(false);
  const lottieRef = useRef<HTMLDivElement | null>(null);

  // form (ALL FIELDS EMPTY BY DEFAULT)
  const [form, setForm] = useState<{
    school_id: number;
    programme_id: number;
    department_id: number;
    gender: "" | "male" | "female";
    dateOfBirth: string;
    preferred_gender: "" | "male" | "female";
    interests: number[];
    personality: string;
    looking_for: number | null;
    bio: string;
    avataar: string;
  }>({
    school_id: 0,
    programme_id: 0,
    department_id: 0,
    gender: "",
    dateOfBirth: "",
    preferred_gender: "",
    interests: [],
    personality: "",
    looking_for: null,
    bio: "",
    avataar: "",
  });

  // ----- DOB wheel state (start empty) -----
  const now = useMemo(() => new Date(), []);
  const YEARS = useMemo(() => Array.from({ length: 70 }, (_, i) => now.getFullYear() - i), [now]);
  const MONTHS = useMemo(() => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
  const [dobYear, setDobYear] = useState<number | null>(null);
  const [dobMonth, setDobMonth] = useState<number | null>(null); // 1..12
  const [dobDay, setDobDay] = useState<number | null>(null);

  const daysInMonth = useMemo(() => {
    const y = dobYear ?? 2000;
    const m = dobMonth ?? 1;
    return new Date(y, m, 0).getDate();
  }, [dobYear, dobMonth]);
  const DAYS = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // sync wheel -> form.dateOfBirth
  useEffect(() => {
    if (dobYear && dobMonth && dobDay) {
      setForm((f) => ({ ...f, dateOfBirth: toDateString(dobYear, dobMonth, dobDay) }));
    } else {
      setForm((f) => ({ ...f, dateOfBirth: "" }));
    }
  }, [dobYear, dobMonth, dobDay]);

  // fetch selects (same mapping)
  useEffect(() => {
    getSchools()
      .then((res: any[]) => setSchools(res.map((s: any) => ({ id: s.id, name: s.school_name })))).catch(console.error);
    getProgrammes()
      .then((res: any[]) => setProgrammes(res.map((p: any) => ({ id: p.id, name: p.programme_name })))).catch(console.error);
    getDepartments()
      .then((res: any[]) => setDepartments(res.map((d: any) => ({ id: d.id, name: d.department_name })))).catch(console.error);
  }, []);

  const onChange = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ----- interests (max 4) -----
  const toggleInterest = (id: number) => setForm((f) => {
    const selected = f.interests.includes(id);
    if (selected) return { ...f, interests: f.interests.filter((x) => x !== id) };
    if (f.interests.length >= 4) return f; // ignore >4
    return { ...f, interests: [...f.interests, id] };
  });

  // ----- cropper -----
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [origFilename, setOrigFilename] = useState("avatar.jpg");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const openCropperForFile = (file: File) => {
    if (pickedUrl) URL.revokeObjectURL(pickedUrl);
    const url = URL.createObjectURL(file);
    setOrigFilename(file.name || "avatar.jpg");
    setPickedUrl(url);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setIsCropOpen(true);
  };

  const onCropComplete = useCallback((_a: Area, px: Area) => setCroppedAreaPixels(px), []);

  const confirmCropAndAttach = async () => {
    if (!pickedUrl || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedFile = await getCroppedImageFile(
        pickedUrl,
        {
          x: Math.round(croppedAreaPixels.x),
          y: Math.round(croppedAreaPixels.y),
          width: Math.round(croppedAreaPixels.width),
          height: Math.round(croppedAreaPixels.height),
        },
        800,
        origFilename
      );
      const compressed = await compressImage(croppedFile, 300);

      // keep the real file for upload after registration
      setAvatarFile(compressed);

      // and a preview for UI
      const dataUrl = await fileToDataUrl(compressed);
      onChange("avataar", dataUrl);

      setIsCropOpen(false);
      if (pickedUrl) URL.revokeObjectURL(pickedUrl);
      setPickedUrl(null);
    } catch (e) {
      console.error(e);
      alert("Failed to process image.");
    } finally {
      setSaving(false);
    }
  };

  // ----- bottom sheet state -----
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFor, setSheetFor] = useState<null | "department" | "school" | "programme">(null);

  const openSheet = (which: "department" | "school" | "programme") => {
    setSheetFor(which);
    setSheetOpen(true);
  };

  const getLabel = (which: "department" | "school" | "programme", id: number) => {
    const list = which === "department" ? departments : which === "school" ? schools : programmes;
    return list.find((x) => x.id === id)?.name || "";
  };

  const currentSheetOptions: OptionItem[] = useMemo(() => {
    if (sheetFor === "department") return departments;
    if (sheetFor === "school") return schools;
    if (sheetFor === "programme") return programmes;
    return [];
  }, [sheetFor, departments, schools, programmes]);

  const handlePick = (id: number) => {
    if (!sheetFor) return;
    if (sheetFor === "department") onChange("department_id", id);
    if (sheetFor === "school") onChange("school_id", id);
    if (sheetFor === "programme") onChange("programme_id", id);
    setSheetOpen(false);
    setSheetFor(null);
  };

  // ----- Lottie overlay controller (only during final submit) -----
  useEffect(() => {
    let anim: any;
    (async () => {
      if (blocking && lottieRef.current) {
        const lottie = (await import("lottie-web")).default;
        anim = lottie.loadAnimation({
          container: lottieRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: "/createacc_lottie.json", // from /public
        });
      }
    })();
    return () => {
      if (anim) anim.destroy();
    };
  }, [blocking]);

  // ----- submit -----
  const submit = async () => {
    setErr(null);
    setSaving(true);
    setBlocking(true); // show overlay while we register + upload avatar
    try {
      // don't send big dataURL to /user/register
      const { avataar, ...rest } = form as any;

      await registerUser(rest as any);

      if (avatarFile) {
        await uploadAvatar(avatarFile); // multipart upload same as Profile page
      }

      window.location.href = "/feed";
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Registration failed");
    } finally {
      setSaving(false);
      setBlocking(false); // will unmount overlay if we didn't redirect
    }
  };

  // ----- progress & gating -----
  const totalSteps = 6; // 0..5
  const pct = ((step + 1) / totalSteps) * 100;

  // block Next/Get Started when current step incomplete
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: // identity
        return !!form.department_id && !!form.school_id && !!form.programme_id;
      case 1: // gender + dob
        return !!form.gender && !!form.dateOfBirth;
      case 2: // interests
        return form.interests.length > 0 && form.interests.length <= 4;
      case 3: // personality
        return !!form.personality;
      case 4: // looking for
        return typeof form.looking_for === "number";
      case 5: // avatar + bio
        return !!form.avataar && form.bio.trim().length > 0;
      default:
        return true;
    }
  }, [
    step,
    form.department_id,
    form.school_id,
    form.programme_id,
    form.gender,
    form.dateOfBirth,
    form.interests.length,
    form.personality,
    form.looking_for,
    form.avataar,
    form.bio,
  ]);

  // ----- bottom sheet for Step 0 selections (FeedMobile UI) -----

  // block Next/Get Started when current step incomplete
  const goNext = () => setStep((s) => clamp(s + 1, 0, totalSteps - 1));
  const goBack = () => setStep((s) => clamp(s - 1, 0, totalSteps - 1));

  return (
    <div className="min-h-screen" style={{ background: "#0D0002", color: "#FFFFFF" }}>
      {/* top bar progress */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || saving}
            style={{ fontSize: "1.25rem", color: "#FFFFFF" }}
            className="opacity-90"
          >
            {/* left chevron */}
            <span style={{ fontSize: "1.7rem" }}>‹</span>
          </button>

          <div style={{ flex: 1, padding: "0 1rem" }}>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#FFFFFF22" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#FF5069", transition: "width .25s" }} />
            </div>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={step === totalSteps - 1 || saving}
            style={{ fontSize: "1.25rem", color: "#FFFFFF" }}
            className="opacity-90"
          >
            <span style={{ fontSize: "1.7rem" }}>›</span>
          </button>
        </div>
      </div>

      {/* step content */}
      <div className="px-5 pb-24">
        {/* header text by step */}
        <h1 className="text-3xl font-semibold mt-6 mb-4" style={{ fontSize: "1.8rem" }}>
          {step === 0 && "Lets confirm your identity"}
          {step === 1 && "Select your gender"}
          {step === 2 && "Choose up-to 4 interests"}
          {step === 3 && "What best describes you?"}
          {step === 4 && "What are you looking for"}
          {step === 5 && "Almost there!"}
        </h1>

        {err && <div className="text-red-400 mb-3">{err}</div>} 

        {/* STEP 0: identity (name/email + menu-card pickers) */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <div className="text-white/70 text-sm mb-1">Name</div>
              <div className="px-4 py-3 rounded-xl" style={{ background: "#1F0004" }}>{displayName || "—"}</div>
            </div>
            <div>
              <div className="text-white/70 text-sm mb-1">Email</div>
              <div className="px-4 py-3 rounded-xl" style={{ background: "#1F0004" }}>{email || "—"}</div>
            </div>

            {/* Triggers that open the FeedMobile-style sheet */}
            <div className="space-y-4">
              <button type="button" className="w-full px-4 py-3 rounded-xl text-left" style={{ background: "#1F0004" }} onClick={() => openSheet("department")}>
                {form.department_id ? `Department: ${getLabel("department", form.department_id)}` : "Select department"}
              </button>

              <button type="button" className="w-full px-4 py-3 rounded-xl text-left" style={{ background: "#1F0004" }} onClick={() => openSheet("school")}>
                {form.school_id ? `School: ${getLabel("school", form.school_id)}` : "Select school"}
              </button>

              <button type="button" className="w-full px-4 py-3 rounded-xl text-left" style={{ background: "#1F0004" }} onClick={() => openSheet("programme")}>
                {form.programme_id ? `Programme: ${getLabel("programme", form.programme_id)}` : "Select programme"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: gender + DOB (wheel) */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="flex items-center gap-8 justify-center mt-4">
              {(["male", "female"] as const).map((g) => {
                const active = form.gender === g;
                return (
                  <button
                    key={g}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-4 ${active ? "" : ""}`}
                    onClick={() => setForm(f => ({ ...f, gender: g, preferred_gender: g === "male" ? "female" : "male" }))}
                    type="button"
                    style={{ background: active ? "#FF506920" : "#FFFFFF0C", borderRadius: "1rem" }}
                  >
                    {g === "male" ? <MaleIcon active={active} /> : <FemaleIcon active={active} />}
                    <span style={{ color: active ? "#FF5069" : "#FFFFFF" }}>{g[0].toUpperCase() + g.slice(1)}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2">
              <div className="text-xl mb-4">Your date of birth</div>
              <div className="grid grid-cols-3 gap-3">
                <Wheel ariaLabel="Day" options={DAYS} value={dobDay} onChange={(v) => setDobDay(Number(v))} />
                <Wheel ariaLabel="Month" options={MONTHS} value={dobMonth ? MONTHS[dobMonth - 1] : null} onChange={(v) => setDobMonth(MONTHS.indexOf(String(v)) + 1)} />
                <Wheel ariaLabel="Year" options={YEARS} value={dobYear} onChange={(v) => setDobYear(Number(v))} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: interests (max 4) */}
        {step === 2 && (
          <>
            <div className="text-white/70 mb-2">These will be used to match you with others</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const selected = form.interests.includes(i.id);
                const full = !selected && form.interests.length >= 4;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => toggleInterest(i.id)}
                    className={`px-4 py-2 rounded-full border transition ${selected ? "" : ""}`}
                    disabled={full}
                    style={{
                      background: selected ? "#FF5069" : "transparent",
                      borderColor: selected ? "#FF5069" : "#FFFFFF33",
                      color: "#FFFFFF",
                      opacity: full ? 0.4 : 1,
                    }}
                  >
                    {i.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-sm text-white/60">{form.interests.length}/4 selected</div>
          </>
        )}

        {/* STEP 3: personality */}
        {step === 3 && (
          <div className="space-y-3 mt-2">
            {['Introvert', 'Extrovert', 'Ambivert', 'Omnivert'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange('personality', p)}
                className={`w-full text-left px-4 py-3 rounded-xl ${form.personality === p ? '' : ''}`}
                style={{ background: form.personality === p ? '#FF5069' : '#FFFFFF0C', color: '#FFFFFF' }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* STEP 4: looking for (→ number) */}
        {step === 4 && (
          <div className="space-y-3 mt-2">
            {LOOKING_FOR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange('looking_for', opt.id)}
                className={`w-full text-left px-4 py-3 rounded-xl ${form.looking_for === opt.id ? '' : ''}`}
                style={{ background: form.looking_for === opt.id ? '#FF5069' : '#FFFFFF0C', color: '#FFFFFF' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* STEP 5: avatar + bio */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: '#FFFFFF0C' }}>
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white/10" style={{ width: '5rem', height: '5rem' }}>
                {form.avataar ? (
                  <img src={form.avataar} alt="avatar preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">+</div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-white/70 text-sm">Profile photo</div>
                <label className="inline-block mt-1 px-3 py-2 rounded-xl cursor-pointer" style={{ background: '#FF5069', color: '#FFFFFF' }}>
                  Upload & Crop
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) openCropperForFile(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="text-white/70 text-sm mb-2">About me</div>
              <textarea
                className="w-full h-40 rounded-2xl px-4 py-3"
                placeholder="Tell people what makes you unique!"
                value={form.bio}
                maxLength={300}
                onChange={(e) => onChange('bio', e.target.value)}
                style={{ background: '#FFFFFF0C', color: '#FFFFFF' }}
              />
              <div className="text-right text-xs text-white/50">{form.bio.length}/300</div>
            </div>
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4" style={{ background: '#0D0002' }}>
        <div className="flex justify-between gap-3">
          <button
            type="button"
            className="px-5 py-3 rounded-2xl"
            onClick={() => setStep((s) => clamp(s - 1, 0, totalSteps - 1))}
            disabled={step === 0 || saving}
            style={{ background: '#FFFFFF0C', color: '#FFFFFF' }}
          >
            Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              type="button"
              className="px-6 py-3 rounded-2xl"
              onClick={() => setStep((s) => clamp(s + 1, 0, totalSteps - 1))}
              disabled={saving || !canProceed}
              style={{ background: '#FF5069', color: '#FFFFFF' }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="px-6 py-3 rounded-2xl"
              onClick={submit}
              disabled={saving || !canProceed}
              style={{ background: '#FF5069', color: '#FFFFFF' }}
            >
              {saving ? "Creating..." : "Get Started"}
            </button>
          )}
        </div>
      </div>

      {/* Cropper modal */}
      {isCropOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80">
            <div className="relative w-full h-[70vh]">
              {pickedUrl && (
                <Cropper
                  image={pickedUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={0.8}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  restrictPosition
                  zoomWithScroll
                  showGrid
                  cropShape="rect"
                  objectFit="cover"
                  classes={{ containerClassName: "absolute inset-0" }}
                />
              )}
            </div>
            <div className="bg-[#0D0002] p-4 flex justify-between">
              <button
                className="px-4 py-2 rounded-xl"
                onClick={() => {
                  setIsCropOpen(false);
                  if (pickedUrl) URL.revokeObjectURL(pickedUrl);
                  setPickedUrl(null);
                }}
                disabled={saving}
                style={{ background: '#FFFFFF22', color: '#FFFFFF' }}
              >
                Cancel
              </button>
              <button className="px-4 py-2 rounded-xl" onClick={confirmCropAndAttach} disabled={saving} style={{ background: '#FF5069', color: '#FFFFFF' }}>
                {saving ? 'Processing...' : 'Use Photo'}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* FeedMobile-style bottom sheet for Step 0 choices (unchanged styling) */}
      <AnimatePresence>
        {sheetOpen && sheetFor && (
          <>
            {/* backdrop */}
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => (saving ? null : (setSheetOpen(false), setSheetFor(null)))}
              className="fixed inset-0 z-[60] bg-[transparent] border-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* sheet */}
            <motion.div
              className="fixed left-0 right-0 bottom-0 z-[61]"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60) {
                  setSheetOpen(false);
                  setSheetFor(null);
                }
              }}
            >
              <div className="bg-[#121212] flex flex-col justify-center item-center rounded-t-[1.25rem] px-[1rem] pb-[1rem]">
                {/* grabber (same as FeedMobile) */}
                <div className="w-full flex justify-center">
                  <DashWide style={{ width: "10rem", height: "3rem", color: "white", padding: "0rem" }} strokeWidth={2.5} />
                </div>
                <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />

                {/* options list (scrollable if long) */}
                <div className="max-h-[50vh] overflow-y-auto">
                  {currentSheetOptions.map((opt, idx) => (
                    <React.Fragment key={opt.id}>
                      <button className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white" onClick={() => handlePick(opt.id)}>
                        {opt.name}
                      </button>
                      {idx < currentSheetOptions.length - 1 && <div className="h-[1px] bg-white/10" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Safe area padding */}
                <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ✅ Blocking Lottie overlay during final submit only */}
      {blocking && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 select-none">
            <div className="w-52 h-52" ref={lottieRef} />
            <div className="absolute bottom-20 text-white/90 text-sm">Creating your account…</div>
          </div>
        </Portal>
      )}
    </div>
  );
}
