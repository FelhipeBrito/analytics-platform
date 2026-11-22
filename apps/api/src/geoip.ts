import axios from "axios";

export async function getLocation(ip: string) {
  if (!ip || !/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  try {
    const { data } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 2500 });
    if (!data?.success) return null;
    return {
      country: typeof data.country === "string" ? data.country : null,
      region: typeof data.region === "string" ? data.region : null,
      city: typeof data.city === "string" ? data.city : null,
      timezone: typeof data.timezone?.id === "string" ? data.timezone.id : null,
    };
  } catch {
    return null;
  }
}
