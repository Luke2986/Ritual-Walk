import React from "react";
import Svg, { Path } from "react-native-svg";

interface FootprintsIconProps {
  size?: number;
  color?: string;
}

export default function FootprintsIcon({ size = 24, color = "#FFFFFF" }: FootprintsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left foot */}
      <Path
        d="M4 16.5C4 15.12 5.12 14 6.5 14C7.88 14 9 15.12 9 16.5C9 17.88 7.88 19 6.5 19C5.12 19 4 17.88 4 16.5Z"
        fill={color}
      />
      <Path
        d="M5.5 12C5.5 10.9 6.4 10 7.5 10C8.6 10 9.5 10.9 9.5 12C9.5 13.1 8.6 14 7.5 14C6.4 14 5.5 13.1 5.5 12Z"
        fill={color}
      />
      <Path
        d="M3 9C3 8.17 3.67 7.5 4.5 7.5C5.33 7.5 6 8.17 6 9C6 9.83 5.33 10.5 4.5 10.5C3.67 10.5 3 9.83 3 9Z"
        fill={color}
      />
      <Path
        d="M6 6.5C6 5.67 6.67 5 7.5 5C8.33 5 9 5.67 9 6.5C9 7.33 8.33 8 7.5 8C6.67 8 6 7.33 6 6.5Z"
        fill={color}
      />
      
      {/* Right foot */}
      <Path
        d="M15 19.5C15 18.12 16.12 17 17.5 17C18.88 17 20 18.12 20 19.5C20 20.88 18.88 22 17.5 22C16.12 22 15 20.88 15 19.5Z"
        fill={color}
      />
      <Path
        d="M14.5 15C14.5 13.9 15.4 13 16.5 13C17.6 13 18.5 13.9 18.5 15C18.5 16.1 17.6 17 16.5 17C15.4 17 14.5 16.1 14.5 15Z"
        fill={color}
      />
      <Path
        d="M18 12C18 11.17 18.67 10.5 19.5 10.5C20.33 10.5 21 11.17 21 12C21 12.83 20.33 13.5 19.5 13.5C18.67 13.5 18 12.83 18 12Z"
        fill={color}
      />
      <Path
        d="M15 9.5C15 8.67 15.67 8 16.5 8C17.33 8 18 8.67 18 9.5C18 10.33 17.33 11 16.5 11C15.67 11 15 10.33 15 9.5Z"
        fill={color}
      />
    </Svg>
  );
}
