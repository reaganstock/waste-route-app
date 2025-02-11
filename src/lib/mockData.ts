export const mockRoutes = [
  {
    id: '1',
    name: 'Monday Downtown Route',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    status: 'completed',
    duration: '3.5',
    completed_houses: 28,
    total_houses: 30,
    efficiency: 93,
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
    ]
  },
  {
    id: '2',
    name: 'Tuesday Residential Route',
    date: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    status: 'completed',
    duration: '4.2',
    completed_houses: 35,
    total_houses: 35,
    efficiency: 100,
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
        isNewCustomer: true
      }
    ]
  },
  {
    id: '3',
    name: 'Wednesday Commercial Route',
    date: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    status: 'completed',
    duration: '5.0',
    completed_houses: 42,
    total_houses: 45,
    efficiency: 93,
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
        status: 'completed'
      },
      {
        id: '8',
        address: '789 Guerrero St',
        lat: '37.7590',
        lng: '-122.4240',
        status: 'completed'
      }
    ]
  },
  {
    id: '4',
    name: 'Thursday Marina Route',
    date: new Date().toISOString(), // Today
    status: 'in_progress',
    duration: '2.8',
    completed_houses: 18,
    total_houses: 25,
    efficiency: 72,
    houses: [
      {
        id: '9',
        address: '123 Marina Blvd',
        lat: '37.7620',
        lng: '-122.4350',
        status: 'pending'
      }
    ]
  },
  {
    id: '5',
    name: 'Friday Mixed Route',
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'pending',
    duration: '0',
    completed_houses: 0,
    total_houses: 32,
    efficiency: 0,
    houses: [
      {
        id: '10',
        address: '789 Chestnut St',
        lat: '37.7640',
        lng: '-122.4280',
        status: 'pending',
        isNewCustomer: true
      },
      {
        id: '11',
        address: '456 Lombard St',
        lat: '37.7680',
        lng: '-122.4260',
        status: 'pending',
        notes: 'Early morning pickup required'
      }
    ]
  },
  {
    id: '6',
    name: 'North Beach Route',
    date: new Date(Date.now() + 2 * 86400000).toISOString(), // Day after tomorrow
    status: 'pending',
    duration: '0',
    completed_houses: 0,
    total_houses: 28,
    efficiency: 0,
    houses: [
      {
        id: '12',
        address: '123 Columbus Ave',
        lat: '37.7740',
        lng: '-122.4280',
        status: 'pending'
      }
    ]
  },
  {
    id: '7',
    name: 'SOMA Express Route',
    date: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
    status: 'completed',
    duration: '3.2',
    completed_houses: 25,
    total_houses: 25,
    efficiency: 100,
    houses: [
      {
        id: '13',
        address: '888 Brannan St',
        lat: '37.7720',
        lng: '-122.4030',
        status: 'completed'
      }
    ]
  },
  {
    id: '8',
    name: 'Financial District Route',
    date: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    status: 'completed',
    duration: '4.5',
    completed_houses: 38,
    total_houses: 40,
    efficiency: 95,
    houses: [
      {
        id: '14',
        address: '101 California St',
        lat: '37.7930',
        lng: '-122.3980',
        status: 'completed'
      }
    ]
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
    id: '123e4567-e89b-12d3-a456-426614174000',
    full_name: 'John Doe',
    role: 'driver',
    status: 'active',
    routes: [
      { id: '1', status: 'in_progress', date: new Date().toISOString() }
    ]
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    full_name: 'Jane Smith',
    role: 'driver',
    status: 'active',
    routes: []
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
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