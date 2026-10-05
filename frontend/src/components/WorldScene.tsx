import React from 'react';

export const WorldScene: React.FC = () => {
  const idPrefix = React.useId().replace(/:/g, '');
  const globeId = `${idPrefix}-world-globe`;
  const atmosphereId = `${idPrefix}-world-atmosphere`;
  const clipId = `${idPrefix}-world-clip`;
  const glowId = `${idPrefix}-world-glow`;

  return (
    <svg
      aria-hidden="true"
      className="tp-world-scene"
      viewBox="0 0 760 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          id={globeId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(306 206) rotate(53) scale(400)"
        >
          <stop stopColor="#70C2BC" />
          <stop offset=".42" stopColor="#287B80" />
          <stop offset=".78" stopColor="#174B56" />
          <stop offset="1" stopColor="#102C38" />
        </radialGradient>
        <radialGradient
          id={atmosphereId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(379 302) rotate(90) scale(256)"
        >
          <stop offset=".76" stopColor="#66D2C5" stopOpacity="0" />
          <stop offset=".91" stopColor="#74E7D5" stopOpacity=".22" />
          <stop offset="1" stopColor="#91F5E1" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="380" cy="302" r="218" />
        </clipPath>
        <filter
          id={glowId}
          x="100"
          y="20"
          width="560"
          height="560"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation="27" />
        </filter>
      </defs>

      <g className="tp-world-scene__stars" fill="#D9FFF5">
        <circle cx="117" cy="146" r="2" />
        <circle cx="181" cy="81" r="1.5" />
        <circle cx="281" cy="74" r="1.5" />
        <circle cx="531" cy="82" r="2" />
        <circle cx="638" cy="183" r="1.5" />
        <circle cx="631" cy="402" r="2" />
        <circle cx="126" cy="420" r="1.5" />
        <circle cx="235" cy="515" r="2" />
        <circle cx="520" cy="520" r="1.5" />
        <circle cx="581" cy="145" r="1" />
        <circle cx="155" cy="281" r="1" />
        <circle cx="571" cy="454" r="1" />
      </g>

      <circle
        cx="380"
        cy="302"
        r="250"
        fill="#48C3B6"
        fillOpacity=".11"
        filter={`url(#${glowId})`}
      />
      <ellipse
        className="tp-world-scene__orbit tp-world-scene__orbit--outer"
        cx="380"
        cy="302"
        rx="316"
        ry="123"
        stroke="#7EE7D5"
        strokeOpacity=".55"
        strokeWidth="1.2"
        transform="rotate(-18 380 302)"
      />
      <ellipse
        className="tp-world-scene__orbit tp-world-scene__orbit--inner"
        cx="380"
        cy="302"
        rx="282"
        ry="176"
        stroke="#B5FFF0"
        strokeOpacity=".24"
        strokeWidth="1"
        transform="rotate(36 380 302)"
      />
      <circle
        className="tp-world-scene__route-dot tp-world-scene__route-dot--one"
        cx="81"
        cy="203"
        r="5"
        fill="#BBFFEA"
      />
      <circle
        className="tp-world-scene__route-dot tp-world-scene__route-dot--two"
        cx="655"
        cy="353"
        r="4"
        fill="#F9C793"
      />

      <g className="tp-world-scene__sphere">
        <circle cx="380" cy="302" r="218" fill={`url(#${globeId})`} />
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M87 132C169 93 279 81 380 83C496 84 589 115 675 164M76 205C164 166 271 153 380 153C497 153 603 174 687 217M67 282C168 250 273 244 380 244C495 244 600 254 694 287M68 357C166 338 273 335 380 335C489 335 596 342 693 363M83 431C180 420 278 418 380 418C484 418 583 425 677 440"
            stroke="#B9F4E6"
            strokeOpacity=".23"
            strokeWidth="1.4"
          />
          <path
            d="M380 82C314 147 282 224 282 302C282 383 316 458 380 522M380 82C447 146 480 223 480 302C480 381 446 458 380 522M380 84C226 132 157 211 157 302C157 394 229 473 380 520M380 84C533 132 603 211 603 302C603 394 531 473 380 520"
            stroke="#B9F4E6"
            strokeOpacity=".2"
            strokeWidth="1.4"
          />
          <path
            d="M188 174L218 147L247 153L256 174L276 181L269 197L247 202L232 220L207 217L199 200L180 192L188 174Z"
            fill="#C7C688"
          />
          <path
            d="M253 226L273 236L286 254L281 272L291 294L282 316L288 340L278 367L265 389L252 379L250 357L240 341L244 317L232 297L240 279L229 260L235 241L253 226Z"
            fill="#D2C991"
          />
          <path
            d="M323 175L345 159L370 164L382 178L405 177L423 189L451 188L472 204L494 208L516 229L508 244L485 245L474 262L451 260L440 276L418 273L402 291L383 287L375 265L355 259L347 239L329 228L315 207L323 175Z"
            fill="#CFCE95"
          />
          <path
            d="M379 297L401 299L418 312L424 330L414 350L403 370L396 395L378 414L365 403L367 380L357 361L365 341L357 321L366 306L379 297Z"
            fill="#D1C893"
          />
          <path
            d="M509 369L531 361L552 369L569 384L564 403L546 412L524 403L508 389L509 369Z"
            fill="#C6C48C"
          />
          <path
            d="M178 178C210 198 223 214 242 230M267 315C303 331 331 346 365 350M411 290C452 272 477 256 511 239M426 328C468 346 497 368 525 391"
            stroke="#FFE0AC"
            strokeOpacity=".62"
            strokeWidth="2"
            strokeDasharray="2 8"
          />
          <circle cx="242" cy="230" r="5" fill="#FFE0AC" />
          <circle cx="365" cy="350" r="5" fill="#FFE0AC" />
          <circle cx="511" cy="239" r="5" fill="#FFE0AC" />
          <circle cx="525" cy="391" r="5" fill="#FFE0AC" />
          <circle cx="242" cy="230" r="14" stroke="#FFE0AC" strokeOpacity=".4" />
          <circle cx="365" cy="350" r="14" stroke="#FFE0AC" strokeOpacity=".4" />
          <rect x="162" y="83" width="440" height="440" fill={`url(#${atmosphereId})`} />
        </g>
        <circle cx="380" cy="302" r="218" stroke="#B9FFF0" strokeOpacity=".52" strokeWidth="1.5" />
        <path
          d="M242 137C283 106 331 88 383 85"
          stroke="#FFFFFF"
          strokeOpacity=".36"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      <path
        className="tp-world-scene__travel-line"
        d="M121 391C215 455 300 463 380 411C462 357 517 365 633 429"
        stroke="#E9BB88"
        strokeOpacity=".78"
        strokeWidth="1.5"
        strokeDasharray="4 10"
      />
      <circle className="tp-world-scene__beacon" cx="121" cy="391" r="4" fill="#FFE0AC" />
      <circle
        className="tp-world-scene__beacon tp-world-scene__beacon--delay"
        cx="633"
        cy="429"
        r="4"
        fill="#FFE0AC"
      />
    </svg>
  );
};
