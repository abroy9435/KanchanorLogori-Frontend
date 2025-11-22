//src/shared/utils/age.ts
export function calculateAge(dob: string | Date | null | undefined): number {
    if (!dob) return 0;
  
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 0; // invalid date
  
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
  
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  }
  