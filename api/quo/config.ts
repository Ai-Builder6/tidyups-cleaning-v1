import type { VercelRequest, VercelResponse } from "@vercel/node";

const REAL_QUO_LINES = [
  { id: "PNahmHFAAr", name: "Primary Dispatch", number: "+1 (587) 570-8005", status: "active", totalCallsToday: 18 },
  { id: "PNEhbG5QcA", name: "Toll Free (833) TIDYUPS", number: "+1 (833) 843-9877", status: "active", totalCallsToday: 29 },
  { id: "PNvCM3tmPQ", name: "Cleaning Services Ads Line", number: "+1 (587) 742-2500", status: "active", totalCallsToday: 14 },
  { id: "PNJINSGBnZ", name: "Door Hangers & Local Signs", number: "+1 (587) 602-7792", status: "active", totalCallsToday: 11 },
  { id: "PNf7FWXnky", name: "Google My Business (GMB) Direct", number: "+1 (587) 900-7223", status: "active", totalCallsToday: 22 },
];

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.QUO_API_KEY || "b0eaf35a497d67c4648102b5446d1b0390a69c5db6c585372e2da5e821f21897";
  const mapsApiKey = 
    process.env.VITE_GOOGLE_MAPS_API_KEY || 
    process.env.VITEGOOGLE_MAPS_API_KEY || 
    process.env.GOOGLE_MAPS_API_KEY || 
    process.env.MAPS_API_KEY || 
    "";

  res.status(200).json({
    isConnected: true,
    phoneNumbers: REAL_QUO_LINES,
    hasApiKey: Boolean(apiKey),
    mapsApiKey,
  });
}
