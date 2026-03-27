import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const translations = [
    {
      id: "31868659-23aa-4197-bf7c-96c14f19063d",
      description: "L'exercice 'Rappel de base' apprend à votre chien à revenir vers vous quand vous l'appelez. C'est un ordre fondamental pour la sécurité et le contrôle, essentiel au quotidien. Une pratique régulière dans différents environnements renforcera la fiabilité du rappel.",
      success_criteria: "Le chien revient vers le maître en moins de 5 secondes après l'appel, même avec des distractions légères, et montre un langage corporel joyeux à son arrivée.",
      stop_criteria: "Le chien montre des signes de stress, d'anxiété ou de peur, ou ignore systématiquement l'ordre malgré des récompenses adaptées.",
      tutorial_steps: [
        { tip: "Assurez-vous que votre chien ne vient pas déjà vers vous avant de l'appeler.", title: "Étape 1 : Commencer à l'intérieur", duration: "5 minutes", instruction: "Commencez dans un endroit calme, sans distractions. Préparez des friandises de grande valeur. Appelez le nom de votre chien suivi de 'Viens !' d'un ton joyeux." },
        { tip: "Faites en sorte que vous rejoindre soit la chose la plus gratifiante.", title: "Étape 2 : Récompenser immédiatement", duration: "5 minutes", instruction: "Dès que votre chien se tourne vers vous et commence à avancer, félicitez-le avec enthousiasme. Quand il vous rejoint, donnez-lui une friandise de grande valeur." },
        { tip: "Ne courez pas trop vite au début pour ne pas décourager votre chien.", title: "Étape 3 : Ajouter du mouvement", duration: "5 minutes", instruction: "Si votre chien revient régulièrement à l'intérieur, essayez de vous éloigner légèrement en l'appelant. Cela l'encourage à vous poursuivre." },
        { tip: "Utilisez une longe si vous craignez qu'il s'éloigne dans un nouvel environnement.", title: "Étape 4 : Passer en extérieur clôturé", duration: "10 minutes", instruction: "Une fois le rappel fiable à l'intérieur, passez à un espace extérieur clos. Reprenez depuis l'étape 1, en augmentant progressivement les distractions." },
        { tip: "Si votre chien a du mal, réduisez le niveau de distraction et revenez à l'étape précédente.", title: "Étape 5 : Introduire des distractions", duration: "10-15 minutes", instruction: "Introduisez progressivement des distractions légères. Gardez les premières séances courtes et très gratifiantes." },
      ],
      troubleshooting: [
        { problem: "Le chien ignore l'ordre.", solution: "La récompense n'est pas assez motivante ou il y a trop de distractions. Revenez dans un environnement plus calme avec de meilleures friandises." },
        { problem: "Le chien se laisse distraire en revenant.", solution: "Réduisez les distractions ou la distance. Pratiquez dans un environnement plus contrôlé." },
        { problem: "Le chien fuit quand on l'appelle.", solution: "Ne poursuivez jamais votre chien. Courez dans la direction opposée pour déclencher son instinct de poursuite. Ne punissez jamais votre chien quand il revient." },
      ],
    },
    {
      id: "264c0ca0-79e9-413a-abd9-251489e4d1de",
      description: "Cet exercice aide votre chien à se concentrer sur vous et à se détourner des distractions. C'est une compétence fondamentale pour le contrôle des impulsions, utilisable dans différents environnements. Pratiquer le 'Look back' renforce votre lien et votre communication.",
      success_criteria: "Le chien établit un contact visuel fiable avec le maître au signal, même en présence de distractions légères, et le maintient pendant au moins 2 secondes.",
      stop_criteria: "Le chien montre des signes de stress, de frustration ou d'inconfort (léchage de babines, bâillements, évitement). Si le chien ne répond pas ou que la séance est trop longue.",
      troubleshooting: [
        { problem: "Le chien ne tourne pas la tête.", solution: "Utilisez une friandise de plus grande valeur ou augmentez le mouvement du leurre." },
        { problem: "Le chien regarde puis détourne immédiatement le regard.", solution: "Récompensez plus rapidement ou demandez un contact visuel plus court au début." },
        { problem: "Le chien est trop distrait pour répondre.", solution: "Revenez dans un environnement moins distrayant. Pratiquez pendant les moments calmes." },
      ],
    },
    {
      id: "17e607c7-8fa3-4e39-9085-69c70ad067b7",
      description: "Cet exercice vise à exposer progressivement votre chien aux environnements animés et aux foules de manière contrôlée et positive. L'objectif est de renforcer sa confiance et de lui apprendre à rester calme malgré la présence de nombreuses personnes. Commencez dans des zones peu fréquentées et progressez vers des environnements plus stimulants.",
      success_criteria: "Le chien est à l'aise dans un environnement modérément fréquenté pendant au moins 15-20 minutes, en restant calme et réactif aux ordres du maître, avec peu ou pas de signes de stress.",
      stop_criteria: "Le chien montre des signes persistants de peur extrême, d'anxiété ou d'agressivité. Si le maître se sent dépassé ou incapable de gérer le comportement du chien en sécurité.",
      troubleshooting: [
        { problem: "Le chien montre de la peur (tremblements, tentatives de fuite).", solution: "Augmentez immédiatement la distance. Si le chien reste anxieux, quittez calmement vers un endroit calme." },
        { problem: "Le chien est trop excité et réactif (aboiements, tire en laisse).", solution: "Redirigez l'attention avec une friandise de grande valeur. Pratiquez des ordres de base pour retrouver la concentration." },
        { problem: "Le chien est indifférent et ne s'engage pas.", solution: "Augmentez la valeur des récompenses. Assurez-vous que l'environnement a suffisamment de stimulation douce." },
      ],
    },
  ];

  const results = [];
  for (const t of translations) {
    const updateData: Record<string, any> = {
      description: t.description,
      success_criteria: t.success_criteria,
      stop_criteria: t.stop_criteria,
      troubleshooting: t.troubleshooting,
    };
    if (t.tutorial_steps) updateData.tutorial_steps = t.tutorial_steps;

    const { error } = await supabase
      .from("exercises")
      .update(updateData)
      .eq("id", t.id);
    results.push({ id: t.id, error: error?.message || "ok" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
