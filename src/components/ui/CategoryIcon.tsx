import React from 'react';
import {
  Binoculars,
  Car,
  Compass,
  Hotel,
  Plane,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import type { ActivityCategory, BookingCategory } from '../../types/travel';

export const ActivityCategoryIcon: React.FC<{
  category: ActivityCategory | BookingCategory;
  className?: string;
}> = ({ category, className = 'h-4 w-4' }) => {
  switch (category) {
    case 'Flight':
    case 'Flights':
      return <Plane className={className} />;
    case 'Hotel':
    case 'Hotels':
      return <Hotel className={className} />;
    case 'Restaurant':
    case 'Restaurants':
      return <Utensils className={className} />;
    case 'Sightseeing':
    case 'Activities':
      return <Binoculars className={className} />;
    case 'Shopping':
      return <ShoppingBag className={className} />;
    case 'Transportation':
      return <Car className={className} />;
    default:
      return <Compass className={className} />;
  }
};
