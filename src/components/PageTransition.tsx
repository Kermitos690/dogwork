import { useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionClass, setTransitionClass] = useState("animate-slide-up");

  useEffect(() => {
    setTransitionClass("");
    const t = requestAnimationFrame(() => {
      setDisplayChildren(children);
      setTransitionClass("animate-slide-up");
    });
    return () => cancelAnimationFrame(t);
  }, [location.pathname, children]);

  return <div className={transitionClass}>{displayChildren}</div>;
}
