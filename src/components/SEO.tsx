import { Helmet } from "react-helmet-async";

const SITE = "https://dogwork-at-home.com";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

/**
 * Per-route head: unique title + description + self-referencing canonical + og:*.
 * Helmet replaces the static tags from index.html for JS crawlers.
 */
export function SEO({ title, description, path, image, type = "website", noindex }: SEOProps) {
  const url = `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
  const img = image ?? `${SITE}/og-image.png`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
    </Helmet>
  );
}
