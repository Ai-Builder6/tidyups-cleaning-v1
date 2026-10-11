import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const mapsApiKey = 
    process.env.VITE_GOOGLE_MAPS_API_KEY || 
    process.env.GOOGLE_MAPS_API_KEY || 
    process.env.MAPS_API_KEY || 
    "";

  const mapId = 
    process.env.VITE_GOOGLE_MAPS_MAP_ID || 
    process.env.GOOGLE_MAPS_MAP_ID || 
    "2bd06c0db10a0a3ccd4c8603";

  res.status(200).json({
    mapsApiKey,
    mapId,
    hasMapsKey: Boolean(mapsApiKey),
  });
}
