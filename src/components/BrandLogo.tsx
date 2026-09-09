import React from 'react';
import headerLogo from '../assets/logo-maicon-header.png';

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
        <img
          src={headerLogo}
          alt="Maicon Automação Logo"
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
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
