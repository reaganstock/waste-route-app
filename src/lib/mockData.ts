export const mockRoutes = [
  {
    id: '1',
    name: 'Monday Route',
    date: new Date().toISOString(),
    status: 'in_progress',
    driver_id: '1',
    houses: [
      {
        id: '1',
        address: '123 Main St',
        lat: '37.7749',
        lng: '-122.4194',
        status: 'pending',
        notes: 'Front door collection'
      },
      {
        id: '2',
        address: '456 Market St',
        lat: '37.7920',
        lng: '-122.4100',
        status: 'pending',
        notes: 'Back alley pickup'
      },
      {
        id: '3',
        address: '789 Mission St',
        lat: '37.7850',
        lng: '-122.4050',
        status: 'pending',
        notes: 'Gate code required'
      }
    ],
    completed_houses: 0,
    total_bins: 18
  },
  {
    id: '2',
    name: 'Tuesday Route',
    date: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
    driver_id: '2',
    houses: [
      {
        id: '4',
        address: '321 Hayes St',
        lat: '37.7770',
        lng: '-122.4220',
        status: 'pending',
        notes: 'Side entrance'
      },
      {
        id: '5',
        address: '654 Folsom St',
        lat: '37.7850',
        lng: '-122.3990',
        status: 'pending',
        notes: null
      }
    ],
    completed_houses: 0,
    total_bins: 25
  },
  {
    id: '3',
    name: 'Wednesday Route',
    date: new Date(Date.now() + 172800000).toISOString(),
    status: 'pending',
    houses: [
      {
        id: '6',
        address: '987 Howard St',
        lat: '37.7830',
        lng: '-122.4110',
        status: 'pending',
        notes: 'Commercial pickup'
      }
    ],
    completed_houses: 0,
    total_bins: 20
  },
  {
    id: '4',
    name: 'Previous Monday Route',
    date: new Date(Date.now() - 604800000).toISOString(),
    status: 'completed',
    driver_id: '1',
    completion_date: new Date(Date.now() - 601200000).toISOString(),
    duration: 185,
    houses: [
      {
        id: '7',
        address: '123 Main St',
        lat: '37.7749',
        lng: '-122.4194',
        status: 'completed',
        notes: 'Front door collection'
      }
    ],
    completed_houses: 15,
    skipped_houses: 2,
    total_bins: 18,
    on_time_percentage: 98,
    efficiency_score: 92,
    manager_rating: 4.8,
    manager_notes: 'Excellent work, very efficient route completion'
  },
  {
    id: '5',
    name: 'Previous Tuesday Route',
    date: new Date(Date.now() - 691200000).toISOString(),
    status: 'completed',
    driver_id: '2',
    completion_date: new Date(Date.now() - 687600000).toISOString(),
    duration: 210,
    houses: [
      {
        id: '8',
        address: '321 Hayes St',
        lat: '37.7770',
        lng: '-122.4220',
        status: 'completed',
        notes: 'Side entrance'
      }
    ],
    completed_houses: 22,
    skipped_houses: 1,
    total_bins: 25,
    on_time_percentage: 95,
    efficiency_score: 88,
    manager_rating: 4.5,
    manager_notes: 'Good performance, some delays but well handled'
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
    efficiency_score: 92,
    on_time_percentage: 98,
    total_bins_collected: 890,
    manager_rating: 4.8,
    manager_notes: 'Excellent performance, consistently efficient',
    routes: [
      { id: '1', status: 'completed', date: new Date().toISOString() }
    ]
  },
  {
    id: '2',
    full_name: 'Jane Smith',
    role: 'driver',
    status: 'active',
    completed_routes: 32,
    efficiency_score: 88,
    on_time_percentage: 95,
    total_bins_collected: 640,
    manager_rating: 4.5,
    manager_notes: 'Very reliable, good communication with team',
    routes: []
  },
  {
    id: '3',
    full_name: 'Bob Wilson',
    role: 'manager',
    status: 'active',
    completed_routes: 12,
    efficiency_score: 85,
    on_time_percentage: 92,
    total_bins_collected: 240,
    admin_rating: 4.7,
    admin_notes: 'Excellent team management and route optimization',
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