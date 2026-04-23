import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { callAI, callAIGateway } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Dog context builder ───────────────────────────────────

const DOG_SCOPED_FEATURE_CODES = new Set([
  "ai_behavior_analysis",
  "ai_evaluation_scoring",
  "ai_progress_report",
  "ai_adoption_plan",
  "ai_plan_generation",
  "dog_analysis",
]);

interface DogContext {
  dog: any;
  evaluation?: any;
  problems?: any[];
  objectives?: any[];
  behaviorLogs?: any[];
}

function formatAge(birthDate: string | null): string {
  if (!birthDate) return "inconnu";
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} an(s) et ${rem} mois` : `${years} an(s)`;
}

function buildDogContextPrompt(ctx: DogContext): string {
  const d = ctx.dog;
  const lines: string[] = [];
  
  // Shelter animal extra info
  const si = d._shelter_info;
  if (si) {
    lines.push(`## 🐕 Fiche de ${d.name} (Animal en refuge)`);
    lines.push(`- Espèce : ${si.species || "chien"}`);
    lines.push(`- Statut : ${si.status || "inconnu"}`);
    if (si.estimated_age) lines.push(`- Âge estimé : ${si.estimated_age}`);
    if (si.arrival_date) lines.push(`- Date d'arrivée : ${si.arrival_date}`);
    if (si.description) lines.push(`- Description : ${si.description}`);
    if (si.behavior_notes) lines.push(`- Notes comportement : ${si.behavior_notes}`);
  } else {
    lines.push(`## 🐕 Fiche de ${d.name}`);
  }
  
  lines.push(`- Race : ${d.breed || "inconnue"}${d.is_mixed ? " (croisé)" : ""}`);
  lines.push(`- Sexe : ${d.sex === "male" ? "Mâle" : d.sex === "female" ? "Femelle" : "non précisé"}${d.is_neutered ? " (stérilisé)" : ""}`);
  if (!si) lines.push(`- Âge : ${formatAge(d.birth_date)}`);
  if (d.weight_kg) lines.push(`- Poids : ${d.weight_kg} kg`);
  if (d.size) lines.push(`- Taille : ${d.size}`);
  if (d.activity_level) lines.push(`- Niveau d'activité : ${d.activity_level}`);
  if (d.environment) lines.push(`- Environnement : ${d.environment}`);
  if (d.origin) lines.push(`- Origine : ${d.origin}`);
  if (d.has_children) lines.push(`- Vit avec des enfants`);
  if (d.has_other_animals) lines.push(`- Vit avec d'autres animaux`);
  if (d.alone_hours_per_day != null) lines.push(`- Seul ${d.alone_hours_per_day}h/jour`);

  // Health
  const health: string[] = [];
  if (d.bite_history) health.push("⚠️ HISTORIQUE DE MORSURE");
  if (d.muzzle_required) health.push("⚠️ Muselière requise");
  if (d.joint_pain) health.push("Douleurs articulaires");
  if (d.heart_problems) health.push("Problèmes cardiaques");
  if (d.epilepsy) health.push("Épilepsie");
  if (d.overweight) health.push("Surpoids");
  if (d.allergies) health.push(`Allergies : ${d.allergies}`);
  if (d.known_diseases) health.push(`Maladies : ${d.known_diseases}`);
  if (d.physical_limitations) health.push(`Limitations : ${d.physical_limitations}`);
  if (d.vet_restrictions) health.push(`Restrictions véto : ${d.vet_restrictions}`);
  if (d.current_treatments) health.push(`Traitements : ${d.current_treatments}`);
  if (d.health_notes) health.push(`Notes santé : ${d.health_notes}`);
  if (health.length > 0) {
    lines.push(`\n### Santé`);
    health.forEach(h => lines.push(`- ${h}`));
  }

  // Behavioral scores
  const scores: string[] = [];
  if (d.obedience_level != null) scores.push(`Obéissance : ${d.obedience_level}/5`);
  if (d.sociability_dogs != null) scores.push(`Sociabilité chiens : ${d.sociability_dogs}/5`);
  if (d.sociability_humans != null) scores.push(`Sociabilité humains : ${d.sociability_humans}/5`);
  if (d.excitement_level != null) scores.push(`Excitabilité : ${d.excitement_level}/5`);
  if (d.frustration_level != null) scores.push(`Frustration : ${d.frustration_level}/5`);
  if (d.recovery_capacity != null) scores.push(`Capacité de récupération : ${d.recovery_capacity}/5`);
  if (d.noise_sensitivity != null) scores.push(`Sensibilité au bruit : ${d.noise_sensitivity}/5`);
  if (d.separation_sensitivity != null) scores.push(`Sensibilité à la séparation : ${d.separation_sensitivity}/5`);
  if (scores.length > 0) {
    lines.push(`\n### Profil comportemental`);
    scores.forEach(s => lines.push(`- ${s}`));
  }

  // Evaluation
  if (ctx.evaluation) {
    const e = ctx.evaluation;
    lines.push(`\n### Évaluation comportementale`);
    if (e.responds_to_name) lines.push(`- Répond au nom : ${e.responds_to_name}`);
    if (e.holds_sit) lines.push(`- Tient le assis : ${e.holds_sit}`);
    if (e.holds_down) lines.push(`- Tient le couché : ${e.holds_down}`);
    if (e.walks_without_pulling) lines.push(`- Marche sans tirer : ${e.walks_without_pulling}`);
    if (e.stays_calm_on_mat) lines.push(`- Reste calme sur tapis : ${e.stays_calm_on_mat}`);
    if (e.reacts_to_dogs) lines.push(`- Réaction aux chiens : ${e.reacts_to_dogs}`);
    if (e.reacts_to_humans) lines.push(`- Réaction aux humains : ${e.reacts_to_humans}`);
    if (e.tolerates_frustration) lines.push(`- Tolérance à la frustration : ${e.tolerates_frustration}`);
    if (e.tolerates_solitude) lines.push(`- Tolérance à la solitude : ${e.tolerates_solitude}`);
    if (e.has_bitten) lines.push(`- A mordu : ${e.has_bitten}`);
    if (e.main_trigger) lines.push(`- Déclencheur principal : ${e.main_trigger}`);
    if (e.recovery_time) lines.push(`- Temps de récupération : ${e.recovery_time}`);
  }

  // Problems
  if (ctx.problems && ctx.problems.length > 0) {
    lines.push(`\n### Problèmes signalés`);
    ctx.problems.forEach(p => {
      let desc = `- ${p.problem_key}`;
      if (p.intensity) desc += ` (intensité ${p.intensity}/5)`;
      if (p.frequency) desc += ` — ${p.frequency}`;
      if (p.comment) desc += ` — ${p.comment}`;
      lines.push(desc);
    });
  }

  // Objectives
  if (ctx.objectives && ctx.objectives.length > 0) {
    lines.push(`\n### Objectifs de travail`);
    ctx.objectives.forEach(o => {
      lines.push(`- ${o.objective_key}${o.is_priority ? " ⭐ (prioritaire)" : ""}`);
    });
  }

  // Recent behavior logs (last 5)
  if (ctx.behaviorLogs && ctx.behaviorLogs.length > 0) {
    lines.push(`\n### Dernières observations terrain (${ctx.behaviorLogs.length} dernières)`);
    ctx.behaviorLogs.forEach(b => {
      const parts = [`Jour ${b.day_id}`];
      if (b.tension_level != null) parts.push(`tension ${b.tension_level}/5`);
      if (b.focus_quality) parts.push(`focus ${b.focus_quality}`);
      if (b.leash_walk_quality) parts.push(`marche en laisse ${b.leash_walk_quality}`);
      if (b.comments) parts.push(`"${b.comments}"`);
      lines.push(`- ${parts.join(" | ")}`);
    });
  }

  return lines.join("\n");
}

async function loadDogContexts(
  admin: any,
  userId: string,
  dogIds: string[],
  userRoles: string[],
  shelterAnimalMatches?: any[],
): Promise<DogContext[]> {
  if (dogIds.length === 0 && (!shelterAnimalMatches || shelterAnimalMatches.length === 0)) return [];

  const contexts: DogContext[] = [];

  // Load regular dogs
  if (dogIds.length > 0) {
    let dogsQuery;
    if (userRoles.includes("educator") || userRoles.includes("admin")) {
      dogsQuery = admin.from("dogs").select("*").in("id", dogIds);
    } else if (userRoles.includes("shelter")) {
      dogsQuery = admin.from("dogs").select("*").in("id", dogIds);
    } else {
      dogsQuery = admin.from("dogs").select("*").in("id", dogIds).eq("user_id", userId);
    }

    const { data: dogs } = await dogsQuery;
    
    for (const dog of (dogs || [])) {
      const [evalRes, probRes, objRes, logRes] = await Promise.all([
        admin.from("dog_evaluations").select("*").eq("dog_id", dog.id).order("created_at", { ascending: false }).limit(1),
        admin.from("dog_problems").select("*").eq("dog_id", dog.id),
        admin.from("dog_objectives").select("*").eq("dog_id", dog.id),
        admin.from("behavior_logs").select("*").eq("dog_id", dog.id).order("created_at", { ascending: false }).limit(5),
      ]);

      contexts.push({
        dog,
        evaluation: evalRes.data?.[0] || undefined,
        problems: probRes.data || [],
        objectives: objRes.data || [],
        behaviorLogs: logRes.data || [],
      });
    }
  }

  // Load shelter animals (they have different schema)
  if (shelterAnimalMatches && shelterAnimalMatches.length > 0) {
    for (const sa of shelterAnimalMatches) {
      // Load evaluations and observations for shelter animals
      const [evalRes, obsRes] = await Promise.all([
        admin.from("shelter_animal_evaluations").select("*").eq("animal_id", sa.id).order("created_at", { ascending: false }).limit(1),
        admin.from("shelter_observations").select("*").eq("animal_id", sa.id).order("created_at", { ascending: false }).limit(5),
      ]);

      // Map shelter animal to dog-like structure for the prompt
      const dogLike = {
        name: sa.name,
        breed: sa.breed || "inconnue",
        sex: sa.sex,
        birth_date: null,
        weight_kg: sa.weight_kg,
        is_mixed: false,
        is_neutered: sa.is_sterilized,
        health_notes: sa.health_notes,
        _shelter_info: {
          species: sa.species,
          status: sa.status,
          estimated_age: sa.estimated_age,
          arrival_date: sa.arrival_date,
          behavior_notes: sa.behavior_notes,
          description: sa.description,
        },
      };

      contexts.push({
        dog: dogLike,
        evaluation: evalRes.data?.[0] || undefined,
        problems: [],
        objectives: [],
        behaviorLogs: (obsRes.data || []).map((o: any) => ({
          day_id: 0,
          comments: `[${o.observation_type}] ${o.content}`,
          created_at: o.observation_date,
        })),
      });
    }
  }

  return contexts;
}

/** Find dogs by name (case-insensitive) from the user's accessible dogs */
async function findDogsByName(
  admin: any,
  userId: string,
  userRoles: string[],
  names: string[],
): Promise<any[]> {
  if (names.length === 0) return [];

  // Get accessible dog IDs based on role
  let dogQuery;
  if (userRoles.includes("admin")) {
    // Admin can see ALL dogs in the system
    dogQuery = admin.from("dogs").select("id, name, user_id");
  } else if (userRoles.includes("educator")) {
    const { data: clientLinks } = await admin
      .from("client_links")
      .select("client_user_id")
      .eq("coach_user_id", userId)
      .eq("status", "active");
    
    const clientIds = (clientLinks || []).map((c: any) => c.client_user_id);
    const allUserIds = [userId, ...clientIds];
    
    dogQuery = admin.from("dogs").select("id, name, user_id").in("user_id", allUserIds);
  } else if (userRoles.includes("shelter")) {
    const { data: adopterLinks } = await admin
      .from("adopter_links")
      .select("adopter_user_id")
      .eq("shelter_user_id", userId);
    
    const adopterIds = (adopterLinks || []).map((a: any) => a.adopter_user_id);
    const allUserIds = [userId, ...adopterIds];
    
    dogQuery = admin.from("dogs").select("id, name, user_id").in("user_id", allUserIds);
  } else if (userRoles.includes("shelter_employee")) {
    const { data: shelterId } = await admin.rpc("get_employee_shelter_id", { _user_id: userId });
    if (shelterId) {
      dogQuery = admin.from("dogs").select("id, name, user_id").eq("user_id", shelterId);
    } else {
      dogQuery = admin.from("dogs").select("id, name, user_id").eq("user_id", userId);
    }
  } else {
    dogQuery = admin.from("dogs").select("id, name, user_id").eq("user_id", userId);
  }

  const { data: allDogs } = await dogQuery;
  
  // Also search shelter_animals for shelter/employee/admin roles
  let shelterAnimals: any[] = [];
  if (userRoles.includes("shelter") || userRoles.includes("shelter_employee") || userRoles.includes("admin")) {
    let shelterQuery;
    if (userRoles.includes("shelter")) {
      shelterQuery = admin.from("shelter_animals").select("id, name, user_id, breed, sex, species, status, estimated_age, weight_kg, behavior_notes, health_notes, description").eq("user_id", userId);
    } else if (userRoles.includes("shelter_employee")) {
      const { data: shelterId } = await admin.rpc("get_employee_shelter_id", { _user_id: userId });
      if (shelterId) {
        shelterQuery = admin.from("shelter_animals").select("id, name, user_id, breed, sex, species, status, estimated_age, weight_kg, behavior_notes, health_notes, description").eq("user_id", shelterId);
      }
    } else if (userRoles.includes("admin")) {
      // Admin can see all shelter animals matching names
      const lowerNames = names.map(n => n.toLowerCase().trim());
      shelterQuery = admin.from("shelter_animals").select("id, name, user_id, breed, sex, species, status, estimated_age, weight_kg, behavior_notes, health_notes, description");
    }
    
    if (shelterQuery) {
      const { data: sa } = await shelterQuery;
      shelterAnimals = (sa || []).map((a: any) => ({ ...a, _source: "shelter_animal" }));
    }
  }

  const combined = [...(allDogs || []), ...shelterAnimals];
  
  // Match by name (case-insensitive)
  const lowerNames = names.map(n => n.toLowerCase().trim());
  return combined.filter((d: any) => lowerNames.includes(d.name.toLowerCase().trim()));
}

/** Extract potential dog names mentioned in user messages */
function extractMentionedNames(messages: Array<{ role: string; content: string }>, knownNames: string[]): string[] {
  if (knownNames.length === 0) return [];
  
  const lowerKnown = knownNames.map(n => n.toLowerCase().trim());
  const mentioned = new Set<string>();
  
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const lowerContent = msg.content.toLowerCase();
    for (let i = 0; i < lowerKnown.length; i++) {
      if (lowerKnown[i].length >= 2 && lowerContent.includes(lowerKnown[i])) {
        mentioned.add(knownNames[i]);
      }
    }
  }
  
  return Array.from(mentioned);
}

// ─── Main handler ──────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[ai-with-credits] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.warn("[ai-with-credits] Auth failed:", userError?.message || "no user");
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`[ai-with-credits] User authenticated: ${userId.slice(0, 8)}...`);

    // 2. Parse body
    const body = await req.json();
    const { feature_code, messages, stream = true, system_prompt, active_dog_id, dog_names } = body;

    if (!feature_code || !messages) {
      console.warn("[ai-with-credits] Missing feature_code or messages");
      return new Response(JSON.stringify({ error: "feature_code et messages requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] Feature: ${feature_code}, messages: ${messages.length}, stream: ${stream}`);

    // 3. Service role client for DB ops
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Look up feature
    const { data: feature, error: featureErr } = await admin
      .from("ai_feature_catalog")
      .select("*")
      .eq("code", feature_code)
      .eq("is_active", true)
      .single();

    if (featureErr || !feature) {
      console.error(`[ai-with-credits] Feature "${feature_code}" not found:`, featureErr?.message);
      return new Response(JSON.stringify({ error: "Fonctionnalité IA non disponible" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] Feature found: ${feature.code}, cost=${feature.credits_cost}, model=${feature.model}`);

    // 4. Collect roles for logging/context and debit every account
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleList = roles?.map((r: { role: string }) => r.role) || [];
    console.log(`[ai-with-credits] Roles: [${roleList.join(",")}], debit enabled for all accounts`);

    const creditsCost = feature.credits_cost;
    const pricePerCreditChf = 0.05;
    const publicPriceChf = Number((creditsCost * pricePerCreditChf).toFixed(4));

    // 4b. Cooldown: 30s between AI calls to prevent spam
    const COOLDOWN_SECONDS = 30;
    const { data: lastCall } = await admin
      .from("ai_credit_ledger")
      .select("created_at")
      .eq("user_id", userId)
      .eq("operation_type", "consumption")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let dogContextPrompt = "";
    const requiresStrictDogScope = DOG_SCOPED_FEATURE_CODES.has(feature_code);
    let resolvedDogContexts: DogContext[] = [];

    try {
      const dogIdsToLoad: Set<string> = new Set();
      let shelterAnimalMatches: any[] = [];

      if (active_dog_id) dogIdsToLoad.add(active_dog_id);

      const shouldLoadMentionedDogs = feature_code.startsWith("chat") || feature_code === "dog_analysis";

      if (shouldLoadMentionedDogs) {
        let allNames: string[] = Array.isArray(dog_names) && dog_names.length > 0 ? dog_names : [];

        if (allNames.length === 0) {
          const { data: userDogs } = await admin.from("dogs").select("name").eq("user_id", userId);
          allNames = (userDogs || []).map((d: any) => d.name);
          console.log(`[ai-with-credits] Auto-discovered ${allNames.length} dog names for user`);

          if (roleList.includes("shelter")) {
            const { data: sa } = await admin.from("shelter_animals").select("name").eq("user_id", userId);
            const saNames = (sa || []).map((a: any) => a.name);
            allNames.push(...saNames);
            console.log(`[ai-with-credits] Added ${saNames.length} shelter animal names`);
          }

          if (roleList.includes("admin") && allNames.length === 0) {
            const potentialNames = new Set<string>();
            for (const msg of messages) {
              if (msg.role !== "user") continue;
              const words = msg.content.match(/[A-ZÀ-Ü][a-zà-ü]{1,}/g) || [];
              words.forEach((w: string) => potentialNames.add(w));
            }

            if (potentialNames.size > 0) {
              const nameArr = Array.from(potentialNames);
              console.log(`[ai-with-credits] Admin: searching for potential names: ${nameArr.join(", ")}`);

              try {
                for (const name of nameArr) {
                  const { data: matchedDogs, error: dogErr } = await admin
                    .from("dogs")
                    .select("id, name, user_id")
                    .ilike("name", name);

                  if (dogErr) {
                    console.error(`[ai-with-credits] Admin dog search error for "${name}":`, dogErr.message);
                  } else if (matchedDogs?.length) {
                    allNames.push(...matchedDogs.map((d: any) => d.name));
                  }

                  const { data: matchedSA, error: saErr } = await admin
                    .from("shelter_animals")
                    .select("id, name, user_id, breed, sex, species, status, estimated_age, weight_kg, behavior_notes, health_notes, description, is_sterilized, arrival_date")
                    .ilike("name", name);

                  if (saErr) {
                    console.error(`[ai-with-credits] Admin shelter search error for "${name}":`, saErr.message);
                  } else if (matchedSA?.length) {
                    allNames.push(...matchedSA.map((a: any) => a.name));
                  }
                }
              } catch (searchErr) {
                console.error(`[ai-with-credits] Admin name search failed:`, searchErr);
              }
            }
          }
        }

        const mentionedNames = extractMentionedNames(messages, allNames);
        if (mentionedNames.length > 0) {
          const mentionedDogs = await findDogsByName(admin, userId, roleList, mentionedNames);
          for (const d of mentionedDogs) {
            if (d._source === "shelter_animal") shelterAnimalMatches.push(d);
            else dogIdsToLoad.add(d.id);
          }
        }
      }

      if (dogIdsToLoad.size > 0 || shelterAnimalMatches.length > 0) {
        resolvedDogContexts = await loadDogContexts(admin, userId, Array.from(dogIdsToLoad), roleList, shelterAnimalMatches);
      }
    } catch (ctxErr) {
      console.error("[ai-with-credits] Dog context loading failed:", ctxErr);
      if (requiresStrictDogScope) {
        return new Response(JSON.stringify({ error: "Impossible de charger le chien sélectionné pour cet outil IA." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (requiresStrictDogScope) {
      if (!active_dog_id) {
        return new Response(JSON.stringify({ error: "Aucun chien sélectionné. Choisissez un chien avant de lancer cet outil IA." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const primaryDogContext = resolvedDogContexts.find((ctx) => ctx?.dog?.id === active_dog_id);
      if (!primaryDogContext) {
        return new Response(JSON.stringify({ error: "Le chien sélectionné est introuvable ou inaccessible pour ce compte." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      dogContextPrompt = "\n\n--- CHIEN SÉLECTIONNÉ (SOURCE UNIQUE DE VÉRITÉ) ---\n" +
        buildDogContextPrompt(primaryDogContext) +
        "\n--- FIN DU CONTEXTE CHIEN ---\n\n" +
        "RÈGLES STRICTES :\n" +
        `- Tu travailles exclusivement sur ce chien : ${primaryDogContext.dog.name} (id ${active_dog_id}).\n` +
        "- N'invente jamais un autre chien, un autre nom, un propriétaire, une date ou une donnée absente du contexte.\n" +
        "- Si une information manque, écris explicitement 'non renseigné' au lieu de la deviner.\n" +
        "- Si la demande dépasse les données disponibles, reste dans les limites et signale la donnée manquante.\n";
    } else if (resolvedDogContexts.length > 0) {
      const contextParts = resolvedDogContexts.map(buildDogContextPrompt);
      dogContextPrompt = "\n\n--- DONNÉES DES CHIENS DE L'UTILISATEUR ---\n" +
        contextParts.join("\n\n---\n\n") +
        "\n--- FIN DES DONNÉES ---\n\n" +
        "INSTRUCTIONS IMPORTANTES :\n" +
        "- Utilise ces données réelles pour personnaliser tes réponses.\n" +
        "- Quand l'utilisateur parle d'un chien par son nom, réfère-toi à sa fiche.\n" +
        "- Adapte tes conseils à son profil (âge, race, santé, comportement, problèmes).\n" +
        "- Si le chien a des contre-indications médicales, mentionne-les dans tes recommandations.\n" +
        "- Si le chien a un historique de morsure ou nécessite une muselière, priorise la sécurité.\n";
    }

    if (lastCall) {
      const elapsed = (Date.now() - new Date(lastCall.created_at).getTime()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        const wait = Math.ceil(COOLDOWN_SECONDS - elapsed);
        console.log(`[ai-with-credits] Cooldown active: ${elapsed.toFixed(0)}s elapsed, need ${COOLDOWN_SECONDS}s`);
        return new Response(JSON.stringify({
          error: `Veuillez patienter ${wait} secondes avant votre prochaine requête IA.`,
          code: "COOLDOWN_ACTIVE",
          retry_after: wait,
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[ai-with-credits] Debiting ${creditsCost} credits for user ${userId.slice(0, 8)}...`);

    const { data: debited, error: debitErr } = await admin.rpc("debit_ai_credits", {
      _user_id: userId,
      _feature_code: feature_code,
      _credits: creditsCost,
      _provider_cost_usd: feature.cost_estimate_avg_usd,
      _metadata: {
        model: feature.model,
        roles: roleList,
        public_price_chf: publicPriceChf,
        active_dog_id: active_dog_id ?? null,
        active_dog_name: resolvedDogContexts.find((ctx) => ctx?.dog?.id === active_dog_id)?.dog?.name ?? null,
      },
    });

    if (debitErr) {
      console.error("[ai-with-credits] debit_ai_credits RPC error:", debitErr.message);
      return new Response(JSON.stringify({ error: "Erreur système de crédits" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (debited === false) {
      const { data: balance } = await admin.rpc("get_ai_balance", { _user_id: userId });
      console.log(`[ai-with-credits] Insufficient credits: balance=${balance}, required=${creditsCost}`);
      return new Response(JSON.stringify({
        error: "Crédits IA insuffisants",
        code: "INSUFFICIENT_CREDITS",
        balance: balance || 0,
        required: creditsCost,
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] Credits debited successfully`);

    // 6. Call AI provider (Gemini via adapter)
    const baseSystemPrompt = system_prompt || 
      "Tu es DogWork AI 🐾, un assistant chaleureux et expert en éducation canine positive intégré à la plateforme DogWork. " +
      "Tu es enjoué, souriant et bienveillant — comme un ami passionné qui adore les chiens ! 😊\n\n" +
      "CAPACITÉS TECHNIQUES IMPORTANTES :\n" +
      "- Tu as ACCÈS à la base de données DogWork. Quand des données de chiens te sont fournies ci-dessous, ce sont des données RÉELLES extraites de la plateforme.\n" +
      "- Ne dis JAMAIS que tu n'as pas accès aux données ou que tu ne peux pas consulter de base de données. C'est FAUX — le système te fournit automatiquement les fiches nécessaires.\n" +
      (requiresStrictDogScope
        ? "- Pour cette demande, tu dois travailler exclusivement sur le chien sélectionné fourni dans le contexte, et sur aucun autre.\n\n"
        : "- Si aucune donnée de chien n'est fournie ci-dessous, c'est simplement que le chien mentionné n'est pas encore enregistré sur la plateforme.\n- Dans ce cas, propose à l'utilisateur d'enregistrer son chien dans l'application pour bénéficier de conseils personnalisés.\n\n") +
      "STYLE DE COMMUNICATION :\n" +
      "- Sois ultra friendly, chaleureux et encourageant 🌟\n" +
      "- Utilise des emojis avec parcimonie mais régulièrement (🐕 🎯 ✅ 💡 ⚠️ 🏆 💪 etc.)\n" +
      "- Commence toujours par un petit mot sympa ou encourageant\n" +
      "- Tutoie l'utilisateur naturellement\n" +
      "- Sois concis et va droit au but\n\n" +
      "FORMAT DES RÉPONSES :\n" +
      "- Structure tes réponses avec des titres courts (##) et des listes à puces\n" +
      "- Utilise des paragraphes courts (2-3 lignes max)\n" +
      "- Mets en **gras** les points clés importants\n" +
      "- Aère bien le texte avec des sauts de ligne\n" +
      "- Privilégie les listes numérotées pour les étapes\n" +
      "- Termine par un encouragement ou une question pour relancer la conversation\n\n" +
      "EXPERTISE :\n" +
      "- Tu utilises le renforcement positif et des méthodes éthiques uniquement\n" +
      "- Réponds en français, de manière structurée, digeste et concrète\n" +
      "- Adapte le niveau de détail : simple pour les débutants, technique pour les pros";
    
    const fullSystemPrompt = baseSystemPrompt + dogContextPrompt;

    const systemMessages = [{ role: "system", content: fullSystemPrompt }];

    console.log(`[ai-with-credits] Calling Gemini: model=${feature.model}, public_price_chf=${publicPriceChf}`);

    // Fallback chain: si le modèle principal est saturé (429/503), on essaie des modèles alternatifs Gemini,
    // puis OpenAI gpt-5-mini via Lovable Gateway en dernier recours.
    const modelChain: string[] = [feature.model];
    if (!modelChain.includes("google/gemini-2.5-flash-lite")) modelChain.push("google/gemini-2.5-flash-lite");
    if (!modelChain.includes("google/gemini-2.5-pro")) modelChain.push("google/gemini-2.5-pro");

    let response: Response | null = null;
    let lastStatus = 0;
    let lastBody = "";
    let providerUsed = "gemini";
    let modelUsed = feature.model;
    try {
      for (const model of modelChain) {
        const attempt = await callAI({
          model,
          messages: [...systemMessages, ...messages],
          stream,
        });
        if (attempt.ok) {
          response = attempt;
          modelUsed = model;
          if (model !== feature.model) {
            console.log(`[ai-with-credits] Fallback Gemini model used: ${model}`);
          }
          break;
        }
        lastStatus = attempt.status;
        lastBody = await attempt.text();
        console.error(`[ai-with-credits] Model ${model} failed: ${attempt.status} ${lastBody.slice(0, 200)}`);
        // Ne tenter le fallback que pour les erreurs de capacité/débit.
        if (attempt.status !== 429 && attempt.status !== 503) {
          break;
        }
      }

      // Last resort: Lovable AI Gateway (OpenAI gpt-5-mini) when all Gemini paths failed with 429/503.
      if (!response && (lastStatus === 429 || lastStatus === 503)) {
        console.log("[ai-with-credits] Trying Lovable Gateway fallback (openai/gpt-5-mini)");
        const gw = await callAIGateway({
          model: "openai/gpt-5-mini",
          messages: [...systemMessages, ...messages],
          stream,
        });
        if (gw && gw.ok) {
          response = gw;
          providerUsed = "lovable_gateway";
          modelUsed = "openai/gpt-5-mini";
          console.log("[ai-with-credits] Lovable Gateway fallback succeeded");
        } else if (gw) {
          lastStatus = gw.status;
          lastBody = await gw.text();
          console.error(`[ai-with-credits] Lovable Gateway failed: ${gw.status} ${lastBody.slice(0, 200)}`);
        }
      }
    } catch (configErr) {
      console.error("[ai-with-credits] AI provider config error:", configErr);
      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: `Remboursement automatique (${feature_code}) — erreur de configuration serveur`,
        _metadata: { feature_code, reason: "config_error", model: feature.model },
      });
      throw configErr;
    }

    if (!response) {
      console.error(`[ai-with-credits] All AI providers failed, last status: ${lastStatus}`);

      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: `Remboursement auto (${feature_code}) — fournisseur IA saturé (${lastStatus})`,
        _metadata: { feature_code, reason: "provider_unavailable", status: lastStatus, model: feature.model },
      });
      console.log(`[ai-with-credits] Credits refunded after AI error (feature=${feature_code})`);

      if (lastStatus === 429 || lastStatus === 503) {
        return new Response(JSON.stringify({
          error: "L'IA est momentanément saturée. Réessayez dans quelques instants — vos crédits ont été remboursés.",
        }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("[ai-with-credits] AI body:", lastBody.slice(0, 500));
      return new Response(JSON.stringify({ error: "Erreur du service IA — vos crédits ont été remboursés." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] AI responded OK via ${providerUsed} (${modelUsed}), stream=${stream}`);

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ai-with-credits] Unhandled error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
