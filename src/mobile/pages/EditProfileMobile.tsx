// src/mobile/pages/EditProfileMobile.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import api, { getMyProfile } from "../../shared/api";
import { getSchools, getProgrammes, getDepartments } from "../../shared/services/optionService";
import type { UserProfileOnReceive } from "../../shared/types";
import { INTERESTS } from "../../shared/constants/interests";
import { useToast } from "../../shared/components/Toast";
import { ArrowLeft } from "lucide-react";
import { createLucideIcon } from "lucide-react";
import { makeUpdateFormData } from "../../shared/utils/makeUpdateFormData";
import { ChevronDown } from "lucide-react";
// ---- FeedMobile-style dash icon (same as your Feed page)
export const DashWide = createLucideIcon("DashWide", [
  ["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }],
]);

// ---- Bottom sheet variants (copied from FeedMobile)
const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring", stiffness: 380, damping: 40 } },
  exit: { y: "100%", transition: { type: "spring", stiffness: 380, damping: 40 } },
};

// ---- helpers/types
type OptionItem = { id: number; name: string };
const PERSONALITIES = ["Introvert", "Extrovert", "Ambivert", "Omnivert"] as const;
const LOOKING = [
  { id: 0, label: "Dating and vibing" },
  { id: 1, label: "Long-term commitment" },
  { id: 2, label: "Something casual" },
  { id: 3, label: "I’m not sure" },
];

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(",");
  const sb = [...b].sort().join(",");
  return sa === sb;
}

// ---- Gender icons from your VectorDrawables
const MaleIcon = ({ active }: { active?: boolean }) => (
  <svg width="" height="" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M9.5,11c1.93,0 3.5,1.57 3.5,3.5S11.43,18 9.5,18S6,16.43 6,14.5S7.57,11 9.5,11zM9.5,9C6.46,9 4,11.46 4,14.5S6.46,20 9.5,20s5.5,-2.46 5.5,-5.5c0,-1.16 -0.36,-2.23 -0.97,-3.12L18,7.42V10h2V4h-6v2h2.58l-3.97,3.97C11.73,9.36 10.66,9 9.5,9z"
      fill={active ? "#FF5069" : "#FF506933"}
    />
  </svg>
);
const FemaleIcon = ({ active }: { active?: boolean }) => (
  <svg width="" height="" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M17.5,9.5C17.5,6.46 15.04,4 12,4S6.5,6.46 6.5,9.5c0,2.7 1.94,4.93 4.5,5.4V17H9v2h2v2h2v-2h2v-2h-2v-2.1C15.56,14.43 17.5,12.2 17.5,9.5zM8.5,9.5C8.5,7.57 10.07,6 12,6s3.5,1.57 3.5,3.5S13.93,13 12,13S8.5,11.43 8.5,9.5z"
      fill={active ? "#FF5069" : "#FF506933"}
    />
  </svg>
);

export default function EditProfileMobile() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { profile?: UserProfileOnReceive } };
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // meta
  const [schools, setSchools] = useState<OptionItem[]>([]);
  const [programmes, setProgrammes] = useState<OptionItem[]>([]);
  const [departments, setDepartments] = useState<OptionItem[]>([]);

  // baseline (for diff)
  const [base, setBase] = useState<UserProfileOnReceive | null>(null);
  const [baseIds, setBaseIds] = useState({ school_id: 0, programme_id: 0, department_id: 0 });

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [schoolId, setSchoolId] = useState(0);
  const [programmeId, setProgrammeId] = useState(0);
  const [departmentId, setDepartmentId] = useState(0);

  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [interests, setInterests] = useState<number[]>([]);
  const [personality, setPersonality] = useState("");
  const [lookingFor, setLookingFor] = useState<number | null>(null);

  const [bio, setBio] = useState("");

  // ---- bottom-sheet picker state
  type Picker = null | "department" | "school" | "programme";
  const [picker, setPicker] = useState<Picker>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, p, d] = await Promise.all([
          getSchools().then((res: any[]) => res.map((x) => ({ id: x.id, name: x.school_name }))),
          getProgrammes().then((res: any[]) => res.map((x) => ({ id: x.id, name: x.programme_name }))),
          getDepartments().then((res: any[]) => res.map((x) => ({ id: x.id, name: x.department_name }))),
        ]);
        setSchools(s);
        setProgrammes(p);
        setDepartments(d);

        const prof = state?.profile ?? (await getMyProfile());
        setBase(prof);

        setName(prof.name ?? "");
        setEmail(prof.email ?? "");

        // resolve initial ids by matching names
        const findId = (arr: OptionItem[], nm?: string | null) =>
          nm ? (arr.find((o) => o.name.toLowerCase() === nm.toLowerCase())?.id ?? 0) : 0;

        const initSchool = findId(s, (prof as any).school_name);
        const initProg = findId(p, (prof as any).programme_name);
        const initDept = findId(d, (prof as any).department_name);

        setSchoolId(initSchool);
        setProgrammeId(initProg);
        setDepartmentId(initDept);
        setBaseIds({ school_id: initSchool, programme_id: initProg, department_id: initDept });

        setGender((prof.gender as "male" | "female") ?? "");
        setDateOfBirth((prof as any).dateOfBirth ?? "");
        setInterests(Array.isArray(prof.interests) ? prof.interests : []);
        setPersonality(prof.personality ?? "");
        setLookingFor(typeof (prof as any).looking_for === "number" ? (prof as any).looking_for : null);
        setBio(prof.bio ?? "");
      } catch (e) {
        console.error(e);
        push({ message: "Failed to load profile.", variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleInterest = (id: number) =>
    setInterests((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // hard cap 4
      return [...prev, id];
    });

  // build JSON with only changed fields
  const buildChanges = () => {
    const body: Record<string, any> = {};
    if (!base) return body;

    if (gender && gender !== base.gender) body.gender = gender;
    if (dateOfBirth && dateOfBirth !== (base as any).dateOfBirth) body.dateOfBirth = dateOfBirth;

    if (!arraysEqual(interests, Array.isArray(base.interests) ? base.interests : []))
      body.interests = interests;

    if (personality && personality !== (base.personality ?? "")) body.personality = personality;

    if (typeof lookingFor === "number" && lookingFor !== (base as any).looking_for)
      body.looking_for = lookingFor;

    if (bio !== (base.bio ?? "")) body.bio = bio;

    if (schoolId !== baseIds.school_id) body.school_id = schoolId;
    if (programmeId !== baseIds.programme_id) body.programme_id = programmeId;
    if (departmentId !== baseIds.department_id) body.department_id = departmentId;

    const jsonText = JSON.stringify(body, null, 2); // pretty JSON with quoted keys
    return jsonText;
  };

  const canSubmit = useMemo(() => {
    const changes = buildChanges();
    console.log(changes)
    return Object.keys(changes).length > 0 && !saving;
  }, [gender, dateOfBirth, interests, personality, lookingFor, bio, schoolId, programmeId, departmentId, saving, base, baseIds]);

  // const onSave = async () => {
  //   const changes = buildChanges();
  //   if (Object.keys(changes).length === 0) {
  //     push({ message: "Nothing to update.", variant: "info" });
  //     return;
  //   }
  //   setSaving(true);
  //   try {
  //     console.log(changes)
  //     await api.put("/user/profile/update", {"update_json":changes});
  //     push({ message: "Profile updated successfully!", variant: "success" });
  //     navigate(-1);
  //   } catch (e: any) {
  //     console.error(e);
  //     push({ message: e?.response?.data?.message || e?.message || "Update failed", variant: "error" });
  //   } finally {
  //     setSaving(false);
  //   }
  // };


  const onSave = async () => {
    const changes = buildChanges() as Record<string, any>;
    if (!changes || (typeof changes === "object" && Object.keys(changes).length === 0)) {
      push({ message: "Nothing to update.", variant: "info" });
      return;
    }
  
    const fd = makeUpdateFormData(changes);
  
    setSaving(true);
    try {
      await api.put("/user/profile/update", fd); // don't set Content-Type yourself
      push({ message: "Profile updated successfully!", variant: "success" });
      navigate(-1);
    } catch (e: any) {
      console.error("PUT /user/profile/update failed:", e?.response?.status, e?.response?.data || e?.message);
      push({ message: e?.response?.data?.message || e?.message || "Update failed", variant: "error" });
    } finally {
      setSaving(false);
    }
  };
  

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0002] text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  // Helpers to show current label
  const labelOf = (list: OptionItem[], id: number, fallback: string) =>
    id ? list.find((x) => x.id === id)?.name ?? fallback : fallback;

  // options for currently open picker
  const pickerData: { items: OptionItem[]; onPick: (id: number) => void } | null =
    (picker === "department"
      ? { items: departments, onPick: (id) => (setDepartmentId(id), setPicker(null)) }
      : picker === "school"
      ? { items: schools, onPick: (id) => (setSchoolId(id), setPicker(null)) }
      : picker === "programme"
      ? { items: programmes, onPick: (id) => (setProgrammeId(id), setPicker(null)) }
      : null);

  return (
    <div className="min-h-screen bg-[#1F0004] text-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1F0004] px-4 pt-4 pb-2 flex items-center gap-3">
        <button className="p-2 rounded-xl bg-transparent" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-semibold">Edit Profile</h1>
      </div>

      <div className="px-4 space-y-6">
        {/* name & email (read-only) */}
        <div>
          {/* <div className="text-white/70 text-sm mb-1">Name</div> */}
          <div className="px-[1rem] py-[0.6rem] mx-[0.7rem] mb-[0.6rem] rounded-[0.3rem] bg-[#0D0002]">{name || "—"}</div>
        </div>
        <div>
          {/* <div className="text-white/70 text-sm mb-1">Email</div> */}
          <div className="px-[1rem] py-[0.6rem] mx-[0.7rem] mb-[0.6rem] rounded-[0.3rem] bg-[#0D0002]">{email || "—"}</div>
        </div>

        {/* educational details using FeedMobile-style MENU CARD pickers */}
        <div className="space-y-3">
          <p className="text-[1.3rem] mx-[1rem]">Educational details</p>

          <button
            type="button"
            onClick={() => setPicker("department")}
            className="px-[1rem] py-[0.6rem] mx-[0.7rem] mb-[0.6rem] rounded-[0.3rem] bg-[#0D0002] w-full flex justify-between items-center"
          >
            {labelOf(departments, departmentId, "Select department")} 
            <ChevronDown size={22} className="opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => setPicker("school")}
            className="px-[1rem] py-[0.6rem] mx-[0.7rem] mb-[0.6rem] rounded-[0.3rem] bg-[#0D0002] w-full flex justify-between items-center"
          >
            {labelOf(schools, schoolId, "Select school")}
            <ChevronDown size={22} className="opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => setPicker("programme")}
            className="px-[1rem] py-[0.6rem] mx-[0.7rem] mb-[0.6rem] rounded-[0.3rem] bg-[#0D0002] w-full flex justify-between items-center"
          >
            {labelOf(programmes, programmeId, "Select programme")}
            <ChevronDown size={22} className="opacity-70" />
          </button>
        </div>

        {/* gender */}
        <div className="space-y-3">
          <p className="text-[1.3rem] mx-[1rem]">Your gender</p>
          <div className="flex justify-center items-center gap-[1rem]">
            {(["male", "female"] as const).map((g) => {
              const active = gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-3 ${
                    active ? "bg-transparent" : "bg-transparent"
                  }`}
                >
                  {g === "male" ? <MaleIcon active={active} /> : <FemaleIcon active={active} />}
                  <span className={active ? "text-[#FF5069]" : "text-[#FF5069]/20"}>{g[0].toUpperCase() + g.slice(1)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DOB */}
        <div>
          <p className="text-[1.3rem] mx-[1rem]">Your date of birth</p>
          <input
            type="date"
            className=" w-[6rem] h-[2rem] border-none px-[1rem] py-[0.6rem] mx-[0.7rem] mb-[0.6rem] rounded-[0.3rem] bg-[#0D0002]"
            value={dateOfBirth || ""}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        {/* Interests */}
        <div>
          <div className="text-[1.3rem] mx-[1rem] mb-[0.2rem]">Your interests</div>
          <div className="flex flex-wrap gap-[0.8rem] mx-[0.7rem] mb-[0.6rem]">
            {INTERESTS.map((i) => {
              const selected = interests.includes(i.id);
              const full = !selected && interests.length >= 4;
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggleInterest(i.id)}
                  disabled={full}
                  className={`px-[0.5rem] py-[0.4rem]  rounded-full !border !border-[#FF5069] text-[1rem] transition
                    ${selected ? "bg-[#FF5069] !text-[#0D0002]" : `bg-transparent ${full ? "opacity-40" : ""}`}`}
                >
                  {i.name}
                </button>
              );
            })}
          </div>
          <div className="text-[0.7rem] text-white/60 mx-[0.7rem] mb-[0.6rem]">{interests.length}/4 selected</div>
        </div>

        {/* Personality */}
        <div>
          <div className="text-[1.3rem] mx-[1rem] mb-[0.2rem]">Your personality</div>
          <div className="mx-[0.7rem] mb-[0.6rem]">
            {PERSONALITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPersonality(p)}
                className={`w-full text-left !bg-[#0D0002] text-[1.1rem] px-[0.8rem] h-[2.5rem] py-3 rounded-[0.2rem] mb-[0.8rem] ${
                  personality === p ? "!border !border-[#FF5069] !text-[#FF5069]" : "!border !border-transparent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Looking for */}
        <div>
          <div className="text-[1.3rem] mx-[1rem] mb-[0.2rem]">You are looking for</div>
          <div className="mx-[0.7rem] mb-[0.6rem]">
            {LOOKING.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLookingFor(opt.id)}
                className={`w-full text-left !bg-[#0D0002] text-[1.1rem] px-[0.8rem] h-[2.5rem] rounded-[0.2rem] mb-[0.8rem] ${
                  lookingFor === opt.id ? "!border !border-[#FF5069] !text-[#FF5069]" : "!border !border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <div className="ext-[1.3rem] mx-[1rem] mb-[0.2rem]">About you</div>
          <textarea
            className="w-[20rem] h-[3rem] px-[0.5rem] py-[0.5rem] mx-[0.7rem] rounded-[0.2rem] bg-[#0D0002] border-transparent"
            placeholder="Tell people what makes you unique!"
            value={bio}
            maxLength={300}
            onChange={(e) => setBio(e.target.value)}
          />
          <div className="text-right text-[0.7rem] mx-[0.9rem] text-white/50">{bio.length}/300</div>
        </div>
      </div>

      {/* --- Footer actions --- */}
      <div className="flex items-center justify-center px-[5rem] py-[5rem]">
        <div className="flex flex-col">
          <button
            type="button"
            className="px-[1rem] py-[0.5rem] rounded-[5rem] text-[1rem] mb-[0.8rem] bg-[#FF5069] text-white disabled:opacity-50"
            onClick={onSave}
            disabled={!canSubmit}
          >
            {saving ? "Updating..." : "Update Profile"}
          </button>

          <button
            type="button"
            className="px-[3rem] py-[0.5rem] text-[1rem] rounded-[5rem] bg-[#0D0002]"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ===== Bottom Sheet Menu Card (FeedMobile styling) ===== */}
      <AnimatePresence>
        {picker && pickerData && (
          <>
            {/* backdrop */}
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => setPicker(null)}
              className="fixed inset-[0rem] z-[60] bg-[transparent] border-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* sheet */}
            <motion.div
              className="fixed left-[0rem] right-[0rem] bottom-[0rem] z-[61]"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60) setPicker(null);
              }}
            >
              <div className="bg-[#121212] flex flex-col justify-center item-center rounded-t-[1.25rem] px-[1rem] pb-[1rem]">
                {/* grabber (exactly like FeedMobile) */}
                <div className="w-full flex justify-center">
                  <DashWide style={{ width: "10rem", height: "3rem", color: "white", padding: "0rem" }} strokeWidth={2.5} />
                </div>
                <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />

                {/* options list */}
                <div className="max-h-[50vh] overflow-y-auto">
                  {pickerData.items.map((opt, idx) => (
                    <React.Fragment key={opt.id}>
                      <button
                        className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white"
                        onClick={() => pickerData.onPick(opt.id)}
                      >
                        {opt.name}
                      </button>
                      {idx < pickerData.items.length - 1 && <div className="h-[1px] bg-white/10" />}
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
    </div>
  );
}
