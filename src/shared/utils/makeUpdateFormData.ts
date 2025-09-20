// src/shared/utils/makeUpdateFormData.ts
export function makeUpdateFormData(changes: unknown): FormData {
    const obj: Record<string, any> =
      typeof changes === "string"
        ? (() => { try { return JSON.parse(changes); } catch { return {}; } })()
        : (changes && typeof changes === "object" ? { ...(changes as any) } : {});
  
    // map fields the API expects (add more as needed)
    // if (obj.dateOfBirth) {
    //   obj.date_of_birth = obj.dateOfBirth;
    //   delete obj.dateOfBirth;
    // }
  
    const fd = new FormData();
    fd.append("update_json", JSON.stringify(obj)); // single, minified JSON string
    return fd;
  }
  