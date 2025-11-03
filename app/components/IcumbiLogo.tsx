import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Filter, FeDropShadow, Rect, Path, G, Circle } from 'react-native-svg';

interface IcumbiLogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
}

export const IcumbiLogo: React.FC<IcumbiLogoProps> = ({ 
  width = 40, 
  height = 40, 
  showText = false 
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4A90E2" stopOpacity={1} />
          <Stop offset="100%" stopColor="#2E5BBA" stopOpacity={1} />
        </LinearGradient>
        <Filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.2"/>
        </Filter>
      </Defs>
      
      {/* Background rounded square with shadow */}
      <Rect 
        x="10" 
        y="10" 
        width="100" 
        height="100" 
        rx="18" 
        ry="18" 
        fill="white" 
        stroke="#e0e0e0" 
        strokeWidth="1" 
        filter="url(#dropShadow)"
      />
      
      {/* House roof */}
      <Path 
        d="M 35 60 L 60 35 L 85 60 L 82 60 L 60 40 L 38 60 Z" 
        fill="#4A90E2"
      />
      
      {/* Chimney */}
      <Rect x="78" y="45" width="5" height="15" fill="#4A90E2"/>
      
      {/* Key positioned diagonally below the roof */}
      <G transform="rotate(30 60 75)">
        {/* Key head (circular) */}
        <Circle cx="50" cy="75" r="7" fill="#4A90E2"/>
        <Circle cx="50" cy="75" r="3.5" fill="white"/>
        
        {/* Key shaft */}
        <Rect x="57" y="72" width="17" height="4" fill="#4A90E2"/>
        
        {/* Key teeth */}
        <Rect x="74" y="76" width="2.5" height="5" fill="#4A90E2"/>
        <Rect x="77" y="76" width="2.5" height="7" fill="#4A90E2"/>
        <Rect x="80" y="76" width="2.5" height="4" fill="#4A90E2"/>
      </G>
      
      {/* Brand name "ICUMBI" - only show if requested */}
      {showText && (
        <text 
          x="60" 
          y="100" 
          textAnchor="middle" 
          fontFamily="Arial, Helvetica, sans-serif" 
          fontSize="9" 
          fontWeight="bold"
          fill="#4A90E2"
        >
          AFRI ESTATE
        </text>
      )}
    </Svg>
  );
};

export default IcumbiLogo;