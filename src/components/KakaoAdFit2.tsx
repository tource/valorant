import React, { useEffect, useRef } from "react";

function KakaoAdFit() {
  const adRef = useRef<boolean>(false);
  const asideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adRef.current) return;
    if (!asideRef.current) return;

    const windowSize = window.innerWidth;

    // 1024px 미만이면 광고 생성 X
    if (windowSize < 1024) {
      asideRef.current.style.display = "none"; // 아예 숨김 처리
      return;
    }

    const ins = document.createElement("ins");
    const script = document.createElement("script");

    ins.className = "kakao_ad_area";
    ins.style.display = "block";

    ins.setAttribute("data-ad-width", "728");
    ins.setAttribute("data-ad-height", "90");
    ins.setAttribute("data-ad-unit", "DAN-PeBO8UnSwYiS9Gqv");

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
