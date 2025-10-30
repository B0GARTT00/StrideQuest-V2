import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

// Running Shoe Icon (dynamic running position)
const RunningShoeIcon = ({ color = '#fff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.5 8C19.5 6.5 17 5.5 15 5.5C14 5.5 13 6 12.5 6.5L11 8.5L9.5 10C8.5 11 7 11.5 5.5 11.5C4 11.5 2.5 12 1.5 13.5C1 14.5 1 15.5 1.5 16.5C2 17.5 3 18 4.5 18H7.5L11 18L15.5 17.5C17 17.5 18.5 17 19.5 16C21 14.5 22 11.5 20.5 8Z"
      fill={color}
      opacity="0.9"
    />
    <Path
      d="M15 5.5C14 5.5 13 6 12.5 6.5L11 8.5L9.5 10"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* Motion lines to indicate running */}
    <Path
      d="M22 7L20 8.5M22 10L20 11M22 13L20 14"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.4"
    />
  </Svg>
);

// Walking Shoe Icon (grounded position)
const WalkingShoeIcon = ({ color = '#fff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 13C19 11.5 16.5 10.5 14.5 10.5C13.5 10.5 12.5 11 12 11.5L10.5 13L9 14C8 15 6.5 15.5 5 15.5C3.5 15.5 2 16 1 17.5C0.5 18.5 0.5 19.5 1 20.5C1.5 21.5 2.5 22 4 22H7L10.5 22L15 21.5C16.5 21.5 18 21 19 20C20.5 18.5 21.5 15.5 20 13Z"
      fill={color}
      opacity="0.9"
    />
    <Path
      d="M14.5 10.5C13.5 10.5 12.5 11 12 11.5L10.5 13L9 14"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* Ground line */}
    <Path
      d="M2 23H22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.3"
    />
  </Svg>
);

// Bike Icon
const BikeIcon = ({ color = '#fff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Back wheel */}
    <Circle cx="6" cy="18" r="3.5" stroke={color} strokeWidth="1.5" fill="none" />
    {/* Front wheel */}
    <Circle cx="18" cy="18" r="3.5" stroke={color} strokeWidth="1.5" fill="none" />
    {/* Frame */}
    <Path
      d="M6 18L10 10L12 8M12 8L14 10L18 18M12 8V6"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Seat */}
    <Path
      d="M9 9H11"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Handlebars */}
    <Path
      d="M11 6H13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// Hiking Shoe Icon (detailed with terrain)
const HikingShoeIcon = ({ color = '#fff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.5 8C19.5 6.5 17 5.5 15 5.5C14 5.5 13 6 12.5 6.5L11 8.5L9.5 10C8.5 11 7 11.5 5.5 11.5C4 11.5 2.5 12 1.5 13.5C1 14.5 1 15.5 1.5 16.5C2 17.5 3 18 4.5 18H7.5L11 18L15.5 17.5C17 17.5 18.5 17 19.5 16C21 14.5 22 11.5 20.5 8Z"
      fill={color}
      opacity="0.9"
    />
    {/* Boot detail lines */}
    <Path
      d="M5 15L5.5 13.5M7 15.5L7.5 14M9 16L9.5 14.5"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.6"
    />
    {/* Treads on sole */}
    <Path
      d="M4 17.5L4.5 18M6 17.5L6.5 18M8 17.5L8.5 18M10 17.5L10.5 18"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* Terrain/mountain peaks */}
    <Path
      d="M2 10L4 6L6 8L8 5L10 7M15 9L17 6L19 8"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.3"
    />
  </Svg>
);

// Main ActivityIcon component
export default function ActivityIcon({ type, color = '#fff', size = 24 }) {
  const activityType = type?.toLowerCase();

  switch (activityType) {
    case 'run':
    case 'running':
    case 'treadmill':
      return <RunningShoeIcon color={color} size={size} />;
    
    case 'walk':
    case 'walking':
      return <WalkingShoeIcon color={color} size={size} />;
    
    case 'cycle':
    case 'bike':
    case 'cycling':
      return <BikeIcon color={color} size={size} />;
    
    case 'hike':
    case 'hiking':
      return <HikingShoeIcon color={color} size={size} />;
    
    default:
      // Default to running shoe for unknown types
      return <RunningShoeIcon color={color} size={size} />;
  }
}
