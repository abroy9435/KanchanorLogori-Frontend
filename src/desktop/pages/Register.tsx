

import React, { useState, useEffect } from "react";
import { registerUser } from "../../shared/services/userService";
import { getSchools, getProgrammes, getDepartments } from "../../shared/services/optionService";
import { INTERESTS } from "../../shared/constants/interests"

export default function Register() {
  const [form, setForm] = useState({
    gender: "male",
    dateOfBirth: "2004-03-21",
    bio: "from website",
    avataar: "", // kept as string to preserve your existing registerUser(form) usage
    preferred_gender: "male",
    school_id: 0,
    programme_id: 0,
    department_id: 0,
    personality: "introvert",
    looking_for: 2,
    interests: [] as number[],
  });

  const [schools, setSchools] = useState<{ id: number; name: string }[]>([]);
  const [programmes, setProgrammes] = useState<{ id: number; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleInterest = (id: number) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id) ? f.interests.filter((i) => i !== id) : [...f.interests, id],
    }));
  };
 /*
  useEffect(() => {
    getSchools().then(setSchools).catch(console.error);
    getProgrammes().then(setProgrammes).catch(console.error);
    getDepartments().then(setDepartments).catch(console.error);
  }, []);
  */
  useEffect(() => {
    getSchools()
      .then((res) =>
        setSchools(res.map((s: any) => ({ id: s.id, name: s.school_name })))
      )
      .catch(console.error);
  
    getProgrammes()
      .then((res) =>
        setProgrammes(res.map((p: any) => ({ id: p.id, name: p.programme_name })))
      )
      .catch(console.error);
  
    getDepartments()
      .then((res) =>
        setDepartments(res.map((d: any) => ({ id: d.id, name: d.department_name })))
      )
      .catch(console.error);
  }, []);

  const onChange = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // helper: convert chosen file -> base64 data URL and store into form.avataar (string)
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      onChange("avataar", dataUrl); // keep avataar as string (base64) so registerUser(form) remains unchanged
    } catch (err) {
      console.error("File read error", err);
      setErr("Failed to read selected image.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      await registerUser(form); // unchanged — sends form object as before
      window.location.href = "/feed";
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h2 className="text-xl font-semibold mb-4">Lets Confirm Your Identity</h2>
      {err && <div className="text-red-400 mb-3">{err}</div>}
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <input
          className="w-full px-3 py-2 text-black rounded"
          placeholder="Gender"
          value={form.gender}
          onChange={(e) => onChange("gender", e.target.value)}
        />

        {/* use date input so value is YYYY-MM-DD */}
        <input
          type="date"
          className="w-full px-3 py-2 text-black rounded"
          placeholder="Date of Birth (YYYY-MM-DD)"
          value={form.dateOfBirth}
          onChange={(e) => onChange("dateOfBirth", e.target.value)}
        />

        <input
          className="w-full px-3 py-2 text-black rounded"
          placeholder="Bio"
          value={form.bio}
          onChange={(e) => onChange("bio", e.target.value)}
        />

        {/* Avatar: allow either paste a URL or upload a local image (converted to base64 string) */}
        <input
          className="w-full px-3 py-2 text-black rounded"
          placeholder="Avatar URL (or use Upload below)"
          value={form.avataar}
          onChange={(e) => onChange("avataar", e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#FF5069] file:text-white mt-2"
        />

        <input
          className="w-full px-3 py-2 text-black rounded"
          placeholder="Preferred Gender"
          value={form.preferred_gender}
          onChange={(e) => onChange("preferred_gender", e.target.value)}
        />

        <select
          className="w-full px-3 py-2 text-black rounded"
          value={form.school_id}
          onChange={(e) => onChange("school_id", Number(e.target.value))}
        >
          <option value={0}>Select School</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="w-full px-3 py-2 bg-gray-900 text-white rounded"
          value={form.programme_id}
          onChange={(e) => onChange("programme_id", Number(e.target.value))}
        >
          <option value={0}>Select Programme</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          className="w-full px-3 py-2 bg-gray-900 text-white rounded"
          value={form.department_id}
          onChange={(e) => onChange("department_id", Number(e.target.value))}
        >
          <option value={0}>Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <input
          className="w-full px-3 py-2 bg-gray-900 text-white rounded"
          placeholder="Personality"
          value={form.personality}
          onChange={(e) => onChange("personality", e.target.value)}
        />

        <input
          className="w-full px-3 py-2 text-black rounded"
          placeholder="Looking For (number)"
          type="number"
          value={form.looking_for}
          onChange={(e) => onChange("looking_for", Number(e.target.value))}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const selected = form.interests.includes(i.id);
            return (
              <button
                type="button"
                key={i.id}
                onClick={() => toggleInterest(i.id)}
                className={`px-3 py-1 rounded-full border ${
                  selected ? "bg-[#FF5069] text-white" : "bg-white text-black"
                }`}
              >
                {i.name}
              </button>
            );
          })}
        </div>

        <button disabled={saving} className="px-4 py-2 rounded bg-white text-black">
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}
