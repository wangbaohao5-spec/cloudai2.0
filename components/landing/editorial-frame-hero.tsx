export function EditorialFrameHero() {
  return (
    <div className="landing-editorial-frame" data-landing-hero-motion>
      <svg
        aria-hidden="true"
        className="landing-editorial-frame-svg landing-editorial-frame-svg-desktop"
        fill="none"
        focusable="false"
        viewBox="0 0 960 240"
      >
        <g className="landing-hero-frame-outer">
          <path d="M88 42V206H522" />
          <path d="M88 42H820V112" />
        </g>

        <g className="landing-hero-frame-inner">
          <path d="M330 105V184H864" />
          <path d="M330 105H442" />
        </g>

        <g className="landing-hero-product-block">
          <rect height="80" width="142" x="136" y="91" />
          <rect className="landing-hero-product-core" height="44" width="48" x="154" y="109" />
          <path d="M216 116H258" />
          <path d="M216 130H252" />
          <path d="M216 144H242" />
        </g>

        <g className="landing-hero-formation-lines">
          <path d="M376 122H514" />
          <path d="M376 140H486" />
          <path d="M376 158H500" />
        </g>

        <g className="landing-hero-formation-tags">
          <rect height="20" width="52" x="528" y="113" />
          <rect height="20" width="66" x="590" y="113" />
        </g>

        <g className="landing-hero-connector" opacity="0.72">
          <path d="M290 131H318" />
          <path d="M666 143H694" />
        </g>

        <g className="landing-hero-asset-stack">
          <rect className="landing-hero-plane-back" height="72" width="116" x="704" y="91" />
          <rect className="landing-hero-plane-middle" height="72" width="116" x="718" y="105" />
          <rect className="landing-hero-plane-front" height="72" width="116" x="732" y="119" />
          <path d="M750 139H798" />
          <path d="M750 153H812" />
          <rect className="landing-hero-plane-label" height="10" width="26" x="750" y="169" />
        </g>
      </svg>

      <svg
        aria-hidden="true"
        className="landing-editorial-frame-svg landing-editorial-frame-svg-mobile"
        fill="none"
        focusable="false"
        viewBox="0 0 360 200"
      >
        <g className="landing-hero-frame-outer">
          <path d="M34 24V176H178" />
          <path d="M34 24H326V74" />
        </g>

        <g className="landing-hero-frame-inner">
          <path d="M120 82V154H332" />
          <path d="M120 82H164" />
        </g>

        <g className="landing-hero-product-block">
          <rect height="58" width="78" x="54" y="79" />
          <rect className="landing-hero-product-core" height="28" width="24" x="66" y="94" />
          <path d="M98 98H120" />
          <path d="M98 108H118" />
          <path d="M98 118H114" />
        </g>

        <g className="landing-hero-formation-lines">
          <path d="M154 99H210" />
          <path d="M154 112H200" />
          <path d="M154 125H206" />
        </g>

        <g className="landing-hero-connector" opacity="0.72">
          <path d="M134 108H146" />
          <path d="M216 112H226" />
        </g>

        <g className="landing-hero-asset-stack">
          <rect className="landing-hero-plane-back" height="48" width="70" x="230" y="78" />
          <rect className="landing-hero-plane-middle" height="48" width="70" x="238" y="86" />
          <rect className="landing-hero-plane-front" height="48" width="70" x="246" y="94" />
          <path d="M258 109H286" />
          <path d="M258 119H294" />
          <rect className="landing-hero-plane-label" height="7" width="18" x="258" y="128" />
        </g>
      </svg>

      <div className="landing-editorial-frame-key" aria-hidden="true">
        <span>商品上下文</span>
        <span>内容结构</span>
        <span>可用资产</span>
      </div>
    </div>
  );
}
