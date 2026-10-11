/**
 * Client and Lead Text Parser for Marketing / Facebook / Ad Lead Intake
 * Parses unstructured lead texts (e.g. Facebook Lead Ads, Web Form inquiries, SMS copies)
 */

export interface ParsedLeadData {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  urgency: 'EMERGENCY' | 'HIGH' | 'SAME_DAY' | 'MEDIUM' | 'ROUTINE';
  equipmentType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning';
  equipmentModel: string;
  bedrooms: string;
  bathrooms: string;
  campaign?: string;
  adset?: string;
  faultCode?: string;
  issueDescription: string;
  accessNotes?: string;
  durationMinutes: number;
}

export function parseLeadOrRawText(rawText: string): ParsedLeadData {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. First & Last Name or Customer Name
  let firstName = '';
  let lastName = '';
  let customerName = '';

  const fnMatch = text.match(/First Name\s*:\s*([^\n\r]+)/i);
  if (fnMatch && fnMatch[1]) firstName = fnMatch[1].trim();

  const lnMatch = text.match(/Last Name\s*:\s*([^\n\r]+)/i);
  if (lnMatch && lnMatch[1]) lastName = lnMatch[1].trim();

  if (firstName || lastName) {
    customerName = `${firstName} ${lastName}`.trim();
  } else {
    const nameMatch = text.match(/(?:Name|Full Name|Customer|Client)\s*:\s*([^\n\r]+)/i);
    if (nameMatch && nameMatch[1]) {
      customerName = nameMatch[1].trim();
    }
  }

  // 2. Phone Number
  let phone = '';
  const phoneMatch = text.match(/(?:Phone|Phone Number|Tel|Mobile)\s*:\s*([^\n\r]+)/i);
  if (phoneMatch && phoneMatch[1]) {
    phone = phoneMatch[1].trim();
  } else {
    const rawPhone = text.match(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
    if (rawPhone) {
      phone = rawPhone[0].trim();
    }
  }

  // 3. Email
  let email = '';
  const emailMatch = text.match(/(?:Email|E-mail|Mail)\s*:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch && emailMatch[1]) {
    email = emailMatch[1].trim();
  } else {
    const anyEmail = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (anyEmail) {
      email = anyEmail[1].trim();
    }
  }

  // 4. Address & Postal Code
  let address = '';
  const streetMatch = text.match(/(?:Street Address|Address|Street|Location)\s*:\s*([^\n\r]+)/i);
  if (streetMatch && streetMatch[1]) {
    address = streetMatch[1].trim();
  }

  let postalCode = '';
  const postMatch = text.match(/(?:Post Code|Postal Code|Zip|Zipcode|Postcode)\s*:\s*([A-Za-z0-9\s]{5,7})/i);
  if (postMatch && postMatch[1]) {
    postalCode = postMatch[1].trim().toUpperCase();
  }

  let city = 'Edmonton';
  const cityMatch = text.match(/(?:City|Town)\s*:\s*([^\n\r]+)/i);
  if (cityMatch && cityMatch[1]) {
    city = cityMatch[1].trim();
  }

  // Format full street address if postal code available
  if (address && !address.toLowerCase().includes('edmonton') && !address.toLowerCase().includes('ab')) {
    address = `${address}, ${city}, AB ${postalCode}`.trim();
  }

  // 5. Bedrooms & Bathrooms
  let bedrooms = '2';
  const bedMatch = text.match(/(?:Bedrooms|How Many Bedrooms|Beds)\s*[^:]*:\s*([0-9.]+)/i);
  if (bedMatch && bedMatch[1]) {
    bedrooms = bedMatch[1].trim();
  }

  let bathrooms = '1.5';
  const bathMatch = text.match(/(?:Bathrooms|How Many Bathrooms|Baths)\s*[^:]*:\s*([0-9.]+)/i);
  if (bathMatch && bathMatch[1]) {
    bathrooms = bathMatch[1].trim();
  }

  // 6. Service Type (Standard, Deep, Move-Out)
  let equipmentType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning' = 'Standard Cleaning';
  let durationMinutes = 120;

  if (
    lower.includes('move-out') ||
    lower.includes('move_out') ||
    lower.includes('move out') ||
    lower.includes('turnover') ||
    lower.includes('end of lease') ||
    lower.includes('moving') ||
    lower.includes('vacate')
  ) {
    equipmentType = 'Move-Out Cleaning';
    durationMinutes = 210;
  } else if (
    lower.includes('deep') ||
    lower.includes('intensive') ||
    lower.includes('spring') ||
    lower.includes('detail')
  ) {
    equipmentType = 'Deep Cleaning';
    durationMinutes = 240;
  } else {
    equipmentType = 'Standard Cleaning';
    durationMinutes = 120;
  }

  // 7. Urgency / Best Date
  let urgency: 'EMERGENCY' | 'HIGH' | 'SAME_DAY' | 'MEDIUM' | 'ROUTINE' = 'SAME_DAY';
  if (lower.includes('asap') || lower.includes('immediately') || lower.includes('emergency') || lower.includes('today')) {
    urgency = 'HIGH';
  } else if (lower.includes('routine') || lower.includes('weekly') || lower.includes('bi-weekly')) {
    urgency = 'MEDIUM';
  }

  // 8. Campaign / Adset Reference
  let campaign = '';
  const campMatch = text.match(/Campaign\s*:\s*([^\n\r]+)/i);
  if (campMatch && campMatch[1]) campaign = campMatch[1].trim();

  let adset = '';
  const adMatch = text.match(/Adset\s*:\s*([^\n\r]+)/i);
  if (adMatch && adMatch[1]) adset = adMatch[1].trim();

  const faultCode = campaign ? `FB-LEAD` : 'JOBBER-READY';
  const equipmentModel = `${bedrooms} Bed / ${bathrooms} Bath Home (${equipmentType})`;

  // 9. Structured Issue Description
  const issueDescription = [
    `Lead Source: ${campaign ? `Facebook Ad (${campaign})` : 'Direct Intake / Web Form'}`,
    `Property Layout: ${bedrooms} Bedrooms, ${bathrooms} Bathrooms`,
    `Requested Service: ${equipmentType}`,
    `Preferred Timing: ${lower.includes('asap') ? 'ASAP / Immediate' : 'Next Available Booking'}`,
    `Client Email: ${email || 'N/A'}`,
    `Client Phone: ${phone || 'N/A'}`,
  ].join(' • ');

  return {
    customerName: customerName || 'Lead Contact',
    phone: phone || '(780) 555-0199',
    email: email || 'lead@dispatchgeeni.com',
    address: address || '10405 Jasper Ave NW, Edmonton, AB',
    city,
    postalCode,
    urgency,
    equipmentType,
    equipmentModel,
    bedrooms,
    bathrooms,
    campaign,
    adset,
    faultCode,
    issueDescription,
    durationMinutes,
  };
}
