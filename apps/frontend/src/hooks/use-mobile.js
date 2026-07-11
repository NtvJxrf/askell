import { useEffect, useState } from "react";

const MOBILE_UA_REGEX = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;

function detectIsMobile() {
  if (typeof navigator === "undefined") return false;

  if (navigator.userAgentData) {
    return !!navigator.userAgentData.mobile;
  }

  return MOBILE_UA_REGEX.test(navigator.userAgent);
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(detectIsMobile);

  useEffect(() => {
    setIsMobile(detectIsMobile());
  }, []);

  return isMobile;
}
