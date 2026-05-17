import { Helmet } from "react-helmet-async";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_TYPE,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_OG_LOCALE,
  SITE_NAME,
  getSeoForPath,
  type SeoRouteConfig,
} from "@/config/seo";

interface SEOHeadProps {
  /** Chemin déclaré dans src/config/seo.ts. */
  path: string;
  /** Override ponctuel (page dynamique). */
  overrides?: Partial<SeoRouteConfig>;
}

/**
 * Composant SEO réutilisable côté client.
 *
 * Limitation importante : Helmet mute le <head> APRÈS hydratation React.
 * Les crawlers sociaux (Facebook, LinkedIn, Slack, WhatsApp, X) n'exécutent
 * pas JS — ils ne voient QUE le HTML statique servi par l'hébergeur.
 * Le pré-rendering par route (scripts/prerender-meta.ts) reste donc requis
 * pour des aperçus sociaux fidèles. Googlebot, lui, exécute JS et bénéficie
 * de ce composant.
 */
export function SEOHead({ path, overrides }: SEOHeadProps) {
  const base = getSeoForPath(path);
  if (!base && !overrides) return null;

  const cfg: SeoRouteConfig = { ...(base as SeoRouteConfig), ...(overrides ?? {}) };
  const image = cfg.ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{cfg.title}</title>
      <meta name="description" content={cfg.description} />
      <link rel="canonical" href={cfg.canonicalUrl} />
      {cfg.noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={DEFAULT_OG_LOCALE} />
      <meta property="og:type" content={cfg.ogType} />
      <meta property="og:title" content={cfg.ogTitle} />
      <meta property="og:description" content={cfg.ogDescription} />
      <meta property="og:url" content={cfg.canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={String(DEFAULT_OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(DEFAULT_OG_IMAGE_HEIGHT)} />
      <meta property="og:image:type" content={DEFAULT_OG_IMAGE_TYPE} />
      {cfg.ogImageAlt ? <meta property="og:image:alt" content={cfg.ogImageAlt} /> : null}

      {/* Twitter / X */}
      <meta name="twitter:card" content={cfg.twitterCard} />
      <meta name="twitter:title" content={cfg.twitterTitle} />
      <meta name="twitter:description" content={cfg.twitterDescription} />
      <meta name="twitter:image" content={cfg.twitterImage || image} />
      {cfg.ogImageAlt ? <meta name="twitter:image:alt" content={cfg.ogImageAlt} /> : null}
    </Helmet>
  );
}

export default SEOHead;
