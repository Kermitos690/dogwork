import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop
 *
 * Sur tablette / mobile, lorsque l'on navigue d'une page longue à une autre via
 * react-router (sans rechargement complet), la position de scroll est conservée.
 * Combiné au lazy-loading et au Suspense fallback qui disparaît immédiatement
 * une fois le chunk chargé, l'utilisateur a l'impression que "rien ne s'affiche"
 * et doit recharger la page pour voir le contenu (qui est en fait monté tout
 * en haut, hors viewport).
 *
 * Ce composant remet le scroll de la fenêtre ET de l'élément racine à 0
 * à chaque changement de pathname, sans affecter les flux de hash (ancres).
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // ne pas casser la navigation par ancre

    // window scroll
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }

    // certains layouts utilisent un conteneur scrollable (#root ou main)
    const root = document.getElementById("root");
    if (root) root.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
