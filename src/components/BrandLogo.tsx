import React, { useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showText?: boolean;
  variant?: 'emblem' | 'full';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  variant = 'emblem',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Central Brand Emblem Container */}
      <div className={`relative ${sizeMap[size]} shrink-0 rounded-2xl select-none overflow-hidden flex items-center justify-center p-0.5 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-zinc-800/80 shadow-lg shadow-black/60`}>
        {!imgError ? (
          <img
            src="/assets/LOGO MAICON AUTOMAÇÃO cinza.png"
            alt="Maicon Automação Logo"
            className="w-full h-full object-contain select-none filter drop-shadow-md"
            onError={() => {
              setImgError(true);
            }}
          />
        ) : (
          <svg
            viewBox="0 0 500 500"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Silver Metallic Gradient for Left M Wing */}
              <linearGradient id="mGreyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="40%" stopColor="#a3aab3" />
                <stop offset="100%" stopColor="#878e96" />
              </linearGradient>

              {/* Lighter Silver Facet */}
              <linearGradient id="mGreyFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="60%" stopColor="#b4bac2" />
                <stop offset="100%" stopColor="#949ba3" />
              </linearGradient>

              {/* Royal Blue Solid Gradient for Right M Wing */}
              <linearGradient id="mBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0066d6" />
                <stop offset="60%" stopColor="#0052b3" />
                <stop offset="100%" stopColor="#003d8a" />
              </linearGradient>
            </defs>

            {/* EMBLEM GRAPHIC GROUP */}
            <g id="logo-graphic" transform="translate(48, 40) scale(0.92)">
              {/* 1. Silver / Grey Left 'M' Pillar & Chevron */}
              {/* Left Vertical Pillar */}
              <path
                d="M 10 32 L 68 32 L 68 280 L 10 280 Z"
                fill="url(#mGreyGrad)"
              />
              {/* Left Top Diagonal Wedge */}
              <path
                d="M 10 32 L 68 32 L 200 160 L 150 200 L 10 60 Z"
                fill="url(#mGreyFacetGrad)"
              />

              {/* 2. Royal Blue Right Diagonal & Pillar */}
              {/* Blue Center Diagonal */}
              <path
                d="M 200 160 L 320 32 L 378 32 L 200 210 Z"
                fill="url(#mBlueGrad)"
              />
              {/* Blue Vertical Inner Pillar */}
              <path
                d="M 248 152 L 298 102 L 298 280 L 248 280 Z"
                fill="#004ea8"
              />

              {/* 3. Wi-Fi Radiation Arcs at top-right */}
              <g transform="translate(350, 6)">
                {/* Inner Arc */}
                <path
                  d="M 2 54 A 32 32 0 0 1 54 54"
                  stroke="#0055b8"
                  strokeWidth="11"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Middle Arc */}
                <path
                  d="M 2 30 A 54 54 0 0 1 76 30"
                  stroke="#0055b8"
                  strokeWidth="11"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Outer Arc */}
                <path
                  d="M 2 6 A 76 76 0 0 1 98 6"
                  stroke="#0055b8"
                  strokeWidth="11"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* 4. Architectural Smart Lock Grille in Perspective */}
              <g transform="translate(306, 88)">
                {/* Outer Louver Grey Frame */}
                <polygon
                  points="5,32 102,0 102,192 5,192"
                  fill="#181c24"
                  stroke="#9ea3a9"
                  strokeWidth="7"
                  strokeLinejoin="round"
                />
                {/* Right vertical post */}
                <line x1="114" y1="0" x2="114" y2="192" stroke="#9ea3a9" strokeWidth="10" strokeLinecap="round" />
                {/* Horizontal Slat Louvers */}
                {[26, 46, 66, 86, 106, 126, 146, 166, 184].map((y, idx) => (
                  <line
                    key={idx}
                    x1="14"
                    y1={y}
                    x2="92"
                    y2={y - 4}
                    stroke="#b4bac2"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                ))}
              </g>

              {/* 5. Typography: "— A U T O M A Ç Ã O —" */}
              <g transform="translate(225, 380)">
                {/* Left accent line */}
                <line x1="-220" y1="-7" x2="-138" y2="-7" stroke="#0055b8" strokeWidth="6.5" strokeLinecap="round" />
                
                {/* "A U T O M A Ç Ã O" */}
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  fill="#0055b8"
                  fontSize="36"
                  fontWeight="900"
                  letterSpacing="12"
                  fontFamily="'Montserrat', 'Arial Black', sans-serif"
                >
                  AUTOMAÇÃO
                </text>

                {/* Right accent line */}
                <line x1="138" y1="-7" x2="220" y2="-7" stroke="#0055b8" strokeWidth="6.5" strokeLinecap="round" />
              </g>

              {/* 6. Typography: "INSTALAÇÃO DE FECHADURAS ELETRÔNICAS" */}
              <text
                x="225"
                y="420"
                textAnchor="middle"
                fill="#9ea3a9"
                fontSize="18.5"
                fontWeight="700"
                letterSpacing="4.5"
                fontFamily="'Montserrat', system-ui, sans-serif"
              >
                INSTALAÇÃO DE FECHADURAS ELETRÔNICAS
              </text>
            </g>
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-wider text-white">MAICON</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/50">
              AUTOMAÇÃO
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium tracking-tight">
            Instalação de Fechaduras Eletrônicas
          </span>
        </div>
      )}
    </div>
  );
};
