import type { VercelRequest, VercelResponse } from "@vercel/node";

function generateServerFallbackAddress(lat: number, lng: number) {
  let city = "Edmonton";
  let neighborhood = "Downtown / ICE District";
  let streetName = "104 Ave NW";
  const streetNum = Math.floor(Math.abs((lat * 1000) % 9000)) + 1000;

  if (lng < -113.62) {
    city = "Edmonton";
    neighborhood = "West Edmonton / Meadowlark";
    streetName = "170 St NW";
  } else if (lng > -113.38) {
    city = "Sherwood Park";
    neighborhood = "Strathcona Industrial / Centre";
    streetName = "Broadmoor Blvd";
  } else if (lat > 53.60) {
    city = "St. Albert";
    neighborhood = "St. Albert Centre / Riel";
    streetName = "St Anne St";
  } else if (lat < 53.40) {
    city = "Nisku / Leduc";
    neighborhood = "Nisku Industrial Park / Airport";
    streetName = "Sparrow Dr";
  } else if (lat < 53.48) {
    city = "Edmonton";
    neighborhood = "South Edmonton / Mill Woods";
    streetName = "Calgary Trail NW";
  } else if (lat < 53.53) {
    city = "Edmonton";
    neighborhood = "Old Strathcona / University";
    streetName = "Whyte (82) Ave NW";
  } else {
    city = "Edmonton";
    neighborhood = "Downtown / ICE District";
    streetName = "Jasper Ave NW";
  }

  return {
    formattedAddress: `${streetNum} ${streetName}, ${city}, AB T5J 0H8`,
    streetNumber: `${streetNum}`,
    streetName,
    neighborhood,
    city,
    state: "AB",
    postalCode: "T5J 0H8",
    fromGoogleApi: false,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Valid lat and lng query parameters required" });
  }

  const mapsKey = 
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.VITEGOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_API_KEY ||
    "";

  if (mapsKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`;
      const response = await fetch(url, {
        headers: {
          Referer: "https://dispatchgeeni.com/",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
          const firstResult = data.results[0];
          let streetNumber = "";
          let streetName = "";
          let neighborhood = "";
          let city = "Edmonton";
          let state = "AB";
          let postalCode = "";

          for (const comp of firstResult.address_components || []) {
            if (comp.types.includes("street_number")) streetNumber = comp.long_name;
            if (comp.types.includes("route")) streetName = comp.long_name;
            if (comp.types.includes("neighborhood") || comp.types.includes("sublocality")) neighborhood = comp.long_name;
            if (comp.types.includes("locality")) city = comp.long_name;
            if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
            if (comp.types.includes("postal_code")) postalCode = comp.long_name;
          }

          return res.status(200).json({
            formattedAddress: firstResult.formatted_address,
            streetNumber,
            streetName,
            neighborhood,
            city,
            state,
            postalCode,
            placeId: firstResult.place_id,
            locationType: firstResult.geometry?.location_type,
            fromGoogleApi: true,
          });
        }
      }
    } catch (gErr) {
      console.warn("Google reverse geocoding fetch error:", gErr);
    }
  }

  return res.status(200).json(generateServerFallbackAddress(lat, lng));
}
