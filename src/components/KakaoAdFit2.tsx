import React, { useEffect, useRef } from "react";

function KakaoAdFit() {
  const adRef = useRef<boolean>(false);
  const asideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adRef.current) return;
    if (!asideRef.current) return;

    const ins = document.createElement("ins");
    const script = document.createElement("script");

    ins.className = "kakao_ad_area";
    ins.style.display = "block"; // 필수

    const windowSize = window.innerWidth; // 오타 수정
    if (windowSize < 1024) {
      ins.setAttribute("data-ad-width", "320");
      ins.setAttribute("data-ad-height", "100");
      ins.setAttribute("data-ad-unit", "");
    } else {
      ins.setAttribute("data-ad-width", "728");
      ins.setAttribute("data-ad-height", "90");
      ins.setAttribute("data-ad-unit", "DAN-PeBO8UnSwYiS9Gqv");
    }

    script.async = true;
    script.type = "text/javascript";
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";

    asideRef.current.appendChild(ins);
    asideRef.current.appendChild(script);

    adRef.current = true;
  }, []);

  return <aside ref={asideRef} className="aside__kakaoAdFit"></aside>;
}

export default React.memo(KakaoAdFit);
