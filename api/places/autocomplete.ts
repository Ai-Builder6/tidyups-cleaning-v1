import type { VercelRequest, VercelResponse } from "@vercel/node";

const EDMONTON_STREETS = [
  "10405 Jasper Ave NW, Edmonton, AB",
  "Whyte Ave (82 Ave NW), Edmonton, AB",
  "10920 84 Ave NW, Edmonton, AB",
  "12420 102 Ave NW, Edmonton, AB",
  "10540 85 Ave NW, Edmonton, AB",
  "3112 119 St NW, Edmonton, AB",
  "14102 102 Ave NW, Edmonton, AB",
  "4904 141 Ave NW, Edmonton, AB",
  "9632 142 St NW, Edmonton, AB",
  "2045 111A St NW, Edmonton, AB",
  "7221 Chivers Pl SW, Edmonton, AB",
  "8306 Chappelle Way SW, Edmonton, AB",
  "574 Saddleback Rd NW, Edmonton, AB",
  "10231 120 St NW, Edmonton, AB",
  "3751 139 Ave NW, Edmonton, AB",
  "740 Knottwood Rd S NW, Edmonton, AB",
  "10740 109 St NW, Edmonton, AB",
  "9434 208 St NW, Edmonton, AB",
  "17115 61 Ave NW, Edmonton, AB",
  "17908 61 Ave NW, Edmonton, AB",
  "12219 103 St NW, Edmonton, AB",
  "10408 155 Ave NW, Edmonton, AB",
  "20123 58 Ave NW, Edmonton, AB",
  "9722 154 St NW, Edmonton, AB",
  "10180 104 St NW, Edmonton, AB",
  "6812 112 Ave NW, Edmonton, AB",
  "4310 114a St NW, Edmonton, AB",
  "12411 106 Ave NW, Edmonton, AB",
  "8910 148 St NW, Edmonton, AB",
  "8310 160 St NW, Edmonton, AB",
  "5110 122 St NW, Edmonton, AB",
  "9812 144 St NW, Edmonton, AB",
  "15403 75 Ave NW, Edmonton, AB",
  "Gateway Blvd NW, Edmonton, AB",
  "Calgary Trail NW, Edmonton, AB",
  "Anthony Henday Dr, Edmonton, AB",
  "Whitemud Dr NW, Edmonton, AB",
  "Yellowhead Trail NW, Edmonton, AB",
  "Windermere Blvd SW, Edmonton, AB",
  "Rabbit Hill Rd NW, Edmonton, AB",
  "Terwillegar Dr NW, Edmonton, AB",
  "St. Albert Trail, St. Albert, AB",
  "Sherwood Dr, Sherwood Park, AB",
  "50 St NW, Edmonton, AB",
  "66 St NW, Edmonton, AB",
  "75 St NW, Edmonton, AB",
  "91 St NW, Edmonton, AB",
  "97 St NW, Edmonton, AB",
  "111 St NW, Edmonton, AB",
  "149 St NW, Edmonton, AB",
  "170 St NW, Edmonton, AB",
  "178 St NW, Edmonton, AB",
  "215 St NW, Edmonton, AB",
  "118 Ave NW, Edmonton, AB",
  "137 Ave NW, Edmonton, AB",
  "153 Ave NW, Edmonton, AB",
  "167 Ave NW, Edmonton, AB",
  "Ellerslie Rd SW, Edmonton, AB",
  "James Mowatt Trail SW, Edmonton, AB"
];

function getLocalPredictions(input: string) {
  const norm = input.toLowerCase().trim();
  return EDMONTON_STREETS
    .filter((s) => s.toLowerCase().includes(norm) || norm.split(" ").some((word) => word.length > 2 && s.toLowerCase().includes(word)))
    .slice(0, 6)
    .map((s, idx) => ({
      description: s,
      placeId: `edmonton-local-${idx}`,
      mainText: s.split(",")[0],
      secondaryText: s.split(",").slice(1).join(",").trim(),
    }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const input = String(req.query.input || req.body?.input || "").trim();

  if (!input || input.length < 2) {
    return res.status(200).json({ predictions: [] });
  }

  const apiKey = 
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.VITEGOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_API_KEY ||
    "";

  if (apiKey) {
    try {
      // Biased to Edmonton (Lat: 53.5461, Lng: -113.4938), radius 45km, Canada
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&location=53.5461,-113.4938&radius=45000&components=country:ca&key=${apiKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`;

      const resp = await fetch(url, {
        headers: {
          Referer: "https://dispatchgeeni.com/",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === "OK" && Array.isArray(data.predictions) && data.predictions.length > 0) {
          const predictions = data.predictions.map((p: any) => ({
            description: p.description,
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || "Edmonton, AB, Canada",
          }));
          return res.status(200).json({ predictions });
        }
      }
    } catch (err: any) {
      console.warn("Places autocomplete API fetch note:", err.message);
    }
  }

  // Always return instantaneous matching Edmonton predictions
  const local = getLocalPredictions(input);
  return res.status(200).json({ predictions: local });
}
