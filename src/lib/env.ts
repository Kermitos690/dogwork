// Environnement runtime DogWork.
// `isDevelopment` = vrai en local / preview Lovable. Les outils internes
// (diagnostics webhook, audit P0...) ne doivent jamais s'afficher en
// production sous ce flag.
export const isDevelopment =
  import.meta.env.DEV === true ||
  (typeof window !== "undefined" &&
    /lovable\.app$/.test(window.location.hostname) &&
    !/^www\.dogwork-at-home\.com$/.test(window.location.hostname));

export const isProduction = !isDevelopment;
