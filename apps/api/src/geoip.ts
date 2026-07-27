import axios from "axios";

export async function getLocation(ip: string) {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}`);

    return {
      country: data.country,
      region: data.regionName,
      city: data.city,
      timezone: data.timezone,
      lat: data.lat,
      lon: data.lon,
    };
  } catch {
    return null;
  }
}