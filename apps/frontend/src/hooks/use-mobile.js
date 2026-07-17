import { useSyncExternalStore } from "react";

const MOBILE_UA_REGEX = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;
const MOBILE_BREAKPOINT = 768;

function detectIsMobileUA() {
  if (typeof navigator === "undefined") return false;

  if (navigator.userAgentData) {
    return !!navigator.userAgentData.mobile;
  }

  return MOBILE_UA_REGEX.test(navigator.userAgent);
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return detectIsMobileUA() || window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

function subscribe(onChange) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
