export const mockRoutes = [
  {
    id: '1',
    name: 'Monday Route',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    status: 'completed',
    houses: [
      {
        id: '1',
        address: '123 Main St',
        lat: '37.7749',
        lng: '-122.4194',
        status: 'completed',
        notes: 'Front door collection'
      },
      {
        id: '2',
        address: '456 Market St',
        lat: '37.7920',
        lng: '-122.4100',
        status: 'completed',
        notes: 'Back alley pickup'
      },
      {
        id: '3',
        address: '789 Mission St',
        lat: '37.7850',
        lng: '-122.4050',
        status: 'skipped',
        notes: 'Gate code required'
      }
    ],
    completed_houses: 2
  },
  {
    id: '2',
    name: 'Tuesday Route',
    date: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    status: 'completed',
    houses: [
      {
        id: '4',
        address: '321 Hayes St',
        lat: '37.7770',
        lng: '-122.4220',
        status: 'completed',
        notes: 'Side entrance'
      },
      {
        id: '5',
        address: '654 Folsom St',
        lat: '37.7850',
        lng: '-122.3990',
        status: 'completed',
        notes: null
      }
    ],
    completed_houses: 2
  },
  {
    id: '3',
    name: 'Wednesday Route',
    date: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    status: 'completed',
    houses: [
      {
        id: '6',
        address: '987 Howard St',
        lat: '37.7830',
        lng: '-122.4110',
        status: 'completed',
        notes: 'Ring doorbell twice'
      },
      {
        id: '7',
        address: '456 Valencia St',
        lat: '37.7830',
        lng: '-122.4210',
        status: 'completed',
        notes: null
      },
      {
        id: '8',
        address: '789 Guerrero St',
        lat: '37.7590',
        lng: '-122.4240',
        status: 'completed',
        notes: null
      }
    ],
    completed_houses: 3
  },
  {
    id: '4',
    name: 'Thursday Route',
    date: new Date().toISOString(), // Today
    status: 'in_progress',
    houses: [
      {
        id: '9',
        address: '123 Castro St',
        lat: '37.7620',
        lng: '-122.4350',
        status: 'pending',
        notes: null
      }
    ],
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
    completed_routes: 45,
    rating: 4.8,
    routes: [
      { id: '1', status: 'in_progress', date: new Date().toISOString() }
    ]
  },
  {
    id: '2',
    full_name: 'Jane Smith',
    role: 'driver',
    status: 'active',
    completed_routes: 32,
    rating: 4.9,
    routes: []
  },
  {
    id: '3',
    full_name: 'Bob Wilson',
    role: 'manager',
    status: 'inactive',
    completed_routes: 12,
    rating: 4.5,
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