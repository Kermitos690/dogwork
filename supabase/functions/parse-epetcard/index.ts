import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdf_base64 } = await req.json();
    if (!pdf_base64 || typeof pdf_base64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing pdf_base64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode PDF from base64
    const pdfBytes = Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0));

    // Extract text content from PDF bytes (simple text extraction)
    const textContent = extractTextFromPdf(pdfBytes);

    // Parse AMICUS PetCard data from extracted text
    const parsed = parseAmicusPetCard(textContent);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-epetcard error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Basic text extraction from PDF binary.
 * Handles common PDF text streams (BT...ET blocks with Tj/TJ operators).
 */
function extractTextFromPdf(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textChunks: string[] = [];

  // Extract text from BT...ET blocks
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];

    // Extract Tj strings
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textChunks.push(tjMatch[1]);
    }

    // Extract TJ array strings
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        textChunks.push(strMatch[1]);
      }
    }
  }

  return textChunks.join(" ");
}

/**
 * Parse AMICUS PetCard fields from extracted text.
 * Swiss PetCards typically contain: Chip number, name, breed, sex, birth date, etc.
 */
function parseAmicusPetCard(text: string): Record<string, any> {
  const result: Record<string, any> = {};

  // Chip ID: 15-digit ISO number (Swiss chips start with 756)
  const chipMatch = text.match(/\b(756\d{12})\b/) || text.match(/\b(\d{15})\b/);
  if (chipMatch) result.chip_id = chipMatch[1];

  // Name patterns (various PetCard layouts)
  const namePatterns = [
    /(?:Name|Nom|Nome|Hundename)\s*[:：]?\s*([A-ZÀ-Ü][a-zà-ü]{1,30})/i,
    /(?:Rufname|Nom\s+d['']appel)\s*[:：]?\s*([A-ZÀ-Ü][a-zà-ü]{1,30})/i,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m) { result.name = m[1]; break; }
  }

  // Breed
  const breedPatterns = [
    /(?:Rasse|Race|Razza|Breed)\s*[:：]?\s*([A-ZÀ-Ü][A-Za-zÀ-ü\s-]{2,50})/i,
  ];
  for (const pat of breedPatterns) {
    const m = text.match(pat);
    if (m) { result.breed = m[1].trim(); break; }
  }

  // Sex
  const sexPatterns = [
    /(?:Geschlecht|Sexe|Sesso|Sex)\s*[:：]?\s*(m[aä]nnlich|weiblich|m[âa]le|femelle|maschio|femmina|M|F|m|f)/i,
  ];
  for (const pat of sexPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = m[1].toLowerCase();
      result.sex = val.startsWith("m") || val === "m" ? "male" : "female";
      break;
    }
  }

  // Birth date (DD.MM.YYYY or YYYY-MM-DD)
  const datePatterns = [
    /(?:Geburtsdatum|Date\s+de\s+naissance|Data\s+di\s+nascita|Born|Né)\s*[:：]?\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i,
    /(?:Geburtsdatum|Date\s+de\s+naissance)\s*[:：]?\s*(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/i,
  ];
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      if (m[3].length === 4) {
        // DD.MM.YYYY
        result.birth_date = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      } else {
        // YYYY-MM-DD
        result.birth_date = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      }
      break;
    }
  }

  // Neutered / Kastriert / Castré
  const neuteredMatch = text.match(/(?:kastriert|castr[ée]|sterilisiert|st[ée]rilis[ée]|castrato|neutered)\s*[:：]?\s*(ja|oui|sì|yes|true)/i);
  if (neuteredMatch) {
    result.is_neutered = true;
  }

  return result;
}
