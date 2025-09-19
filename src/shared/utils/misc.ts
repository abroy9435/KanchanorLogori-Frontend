// merge class names safely
export function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(" ");
  }
  
  // (optional) format a date like "2025-08-29" → "29 Aug 2025"
  export function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  
  // (optional) truncate long text, e.g. bios
  export function truncateText(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
  }
  