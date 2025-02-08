export const mockRoutes = [
  {
    id: '1',
    name: 'Monday Route',
    date: new Date().toISOString(),
    status: 'in_progress',
    houses: { count: 15 },
    completed_houses: 5
  },
  {
    id: '2',
    name: 'Tuesday Route',
    date: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
    houses: { count: 20 },
    completed_houses: 0
  },
  {
    id: '3',
    name: 'Wednesday Route',
    date: new Date(Date.now() + 172800000).toISOString(),
    status: 'pending',
    houses: { count: 18 },
    completed_houses: 0
  }
];

// Using San Francisco area coordinates for testing
export const mockHouses = [
  {
    id: '1',
    address: '123 Main St',
    lat: '37.7749',
    lng: '-122.4194',
    status: 'pending',
    route_id: '1',
    notes: 'Front door collection'
  },
  {
    id: '2',
    address: '456 Market St',
    lat: '37.7920',
    lng: '-122.4100',
    status: 'collect',
    route_id: '1',
    notes: 'Back alley pickup'
  },
  {
    id: '3',
    address: '789 Mission St',
    lat: '37.7850',
    lng: '-122.4050',
    status: 'skip',
    route_id: '1',
    notes: 'Gate code required'
  },
  {
    id: '4',
    address: '321 Hayes St',
    lat: '37.7770',
    lng: '-122.4220',
    status: 'pending',
    route_id: '2'
  },
  {
    id: '5',
    address: '654 Folsom St',
    lat: '37.7850',
    lng: '-122.3990',
    status: 'pending',
    route_id: '2'
  },
  {
    id: '6',
    address: '987 Howard St',
    lat: '37.7830',
    lng: '-122.4110',
    status: 'pending',
    route_id: '3'
  }
];

export const mockTeamMembers = [
  {
    id: '1',
    full_name: 'John Doe',
    role: 'driver',
    status: 'active',
    routes: [
      { id: '1', status: 'in_progress', date: new Date().toISOString() }
    ]
  },
  {
    id: '2',
    full_name: 'Jane Smith',
    role: 'driver',
    status: 'active',
    routes: []
  },
  {
    id: '3',
    full_name: 'Bob Wilson',
    role: 'manager',
    status: 'inactive',
    routes: []
  }
];

export const mockAuth = {
  users: [
    {
      id: '1',
      email: 'demo@example.com',
      password: 'password123',
      name: 'Demo User',
      role: 'driver'
    },
    {
      id: '2',
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin'
    }
  ]
}; 