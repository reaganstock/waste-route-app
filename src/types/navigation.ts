export type RootStackParamList = {
  // Auth screens
  index: undefined;
  signup: undefined;
  'forgot-password': undefined;
  
  // Main app screens
  '(tabs)': undefined;
  'route/[id]': { id: string };
  'route-create': undefined;
  map: undefined;
  settings: undefined;
};

export type TabParamList = {
  index: undefined; // Home tab
  team: undefined; // Team tab
};

// Helper type for route names
export type AppRoutes = keyof RootStackParamList;
export type TabRoutes = keyof TabParamList; 