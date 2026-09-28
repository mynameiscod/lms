import React from 'react';
import TimeComplexity from './TimeComplexity';
import SpaceComplexity from './SpaceComplexity';

/**
 * Concept animations, by the `conceptWidget` key an item carries. A new concept is a new
 * component and one line here; the admin picks it by key.
 */
export const CONCEPT_WIDGETS: Record<string, { label: string; component: React.FC }> = {
  time_complexity: { label: 'Time complexity — growth race', component: TimeComplexity },
  space_complexity: { label: 'Space complexity — memory boxes', component: SpaceComplexity },
};
