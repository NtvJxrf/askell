import { useEffect, useState } from "react";

const MOBILE_UA_REGEX = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;
const MOBILE_BREAKPOINT = 768;

function detectIsMobileUA() {
  if (typeof navigator === "undefined") return false;

  if (navigator.userAgentData) {
    return !!navigator.userAgentData.mobile;
  }

  return MOBILE_UA_REGEX.test(navigator.userAgent);
}

function detectIsNarrowViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function detectIsMobile() {
  return detectIsMobileUA() || detectIsNarrowViewport();
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(detectIsMobile);

  useEffect(() => {
    setIsMobile(detectIsMobile());

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(detectIsMobile());
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
