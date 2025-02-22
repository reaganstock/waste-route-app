import { supabase } from '../lib/supabase';

const CACHE_EXPIRY_DAYS = 30;
const BATCH_SIZE = 5;
const BATCH_DELAY = 1100; // slightly over 1 second to respect rate limits

const isWithinDays = (date, days) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - days);
  return new Date(date) > expiryDate;
};

const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const validateAddress = (address) => {
  if (!address || typeof address !== 'string') {
    console.log('Validation failed: address is empty or not a string');
    return { isValid: false, error: 'Invalid address format' };
  }

  // First, normalize the address by ensuring there's a comma before the ZIP
  // and handling multiple spaces
  let normalizedAddress = address
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .trim()
    .replace(/(\s*)(\d{5}(-\d{4})?)\s*$/, ', $2'); // Add comma before ZIP if missing
  
  console.log('Normalized address:', normalizedAddress);
  
  // Split by commas and clean each part
  const parts = normalizedAddress.split(',').map(part => part.trim());
  console.log('Address parts:', parts);
  
  // More lenient validation - just ensure we have at least a street and location info
  if (parts.length < 2) {
    console.log('Validation failed: not enough parts');
    return { 
      isValid: false, 
      error: 'Address must include at least street and city/state/ZIP',
      details: 'Format example: "123 Main St, City, ST 12345"'
    };
  }

  // Extract parts - last part should contain state and ZIP
  const street = parts[0];
  
  // Look for state and ZIP in the last two parts
  const lastParts = parts.slice(-2).join(' '); // Combine last two parts
  console.log('Checking state and ZIP in:', lastParts);
  
  // Validate street
  if (!street || street.length < 3) {
    console.log('Validation failed: invalid street');
    return { isValid: false, error: 'Invalid street address' };
  }

  // Check for state and ZIP pattern in combined last parts
  const stateZipMatch = lastParts.match(/([A-Za-z]{2})[\s,]+(\d{5}(-\d{4})?)/);
  if (!stateZipMatch) {
    console.log('Validation failed: no valid state/ZIP pattern found in:', lastParts);
    return { isValid: false, error: 'State code not found (should be 2 letters)' };
  }

  // If we got here, the address is valid enough to try geocoding
  return { 
    isValid: true,
    normalizedAddress: normalizedAddress
  };
};

const geocodeWithNominatim = async (address) => {
  try {
    // Validate address format first
    const validation = validateAddress(address);
    if (!validation.isValid) {
      return { error: validation.error };
    }

    // Format address for better Nominatim results
    const parts = validation.normalizedAddress.split(',').map(part => part.trim());
    const [street, city, state, zip] = parts;
    
    // Try different query formats in order of specificity
    const queries = [
      // Full address
      `${street}, ${city}, ${state} ${zip}, USA`,
      // Without ZIP
      `${street}, ${city}, ${state}, USA`,
      // Just street and city
      `${street}, ${city}, USA`
    ];

    let bestResult = null;
    let bestConfidence = 0;

    for (const query of queries) {
      console.log('Trying query:', query);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=1&` +
        `countrycodes=us`
      );
      
      if (!response.ok) {
        console.error('Nominatim error:', response.status, response.statusText);
        continue;
      }
      
      const data = await response.json();
      console.log('Nominatim response for', query, ':', data);
      
      if (data && data.length > 0) {
        const result = data[0];
        if (result.importance > bestConfidence) {
          bestResult = result;
          bestConfidence = result.importance;
        }
      }

      // If we got a good match, no need to try other queries
      if (bestConfidence > 0.5) break;
    }

    if (!bestResult) {
      return { 
        error: 'Address not found in OpenStreetMap database',
        details: 'The address could not be found. This may be because it\'s too new or not in the OpenStreetMap database.'
      };
    }

    // Accept the result even with lower confidence, but include a warning
    const warning = bestConfidence < 0.5 ? 
      'Low confidence match, but coordinates should be in the correct area.' : null;

    return {
      lat: parseFloat(bestResult.lat),
      lng: parseFloat(bestResult.lon),
      display_name: bestResult.display_name,
      confidence: bestConfidence,
      warning
    };
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return { 
      error: 'Geocoding service error',
      details: error.message
    };
  }
};

export const geocodeAddress = async (address) => {
  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('geocoded_addresses')
      .select('*')
      .eq('address', address)
      .single();

    if (cached && isWithinDays(cached.created_at, CACHE_EXPIRY_DAYS)) {
      return cached;
    }

    // Geocode with rate limiting
    const result = await geocodeWithNominatim(address);
    
    // Cache result if successful
    if (result && !result.error) {
      await supabase.from('geocoded_addresses').upsert({
        address,
        lat: result.lat,
        lng: result.lng,
        created_at: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const batchGeocodeAddresses = async (addresses, onProgress) => {
  const chunks = chunk(addresses, BATCH_SIZE);
  const results = [];
  const errors = [];

  for (let i = 0; i < chunks.length; i++) {
    const promises = chunks[i].map(async (address) => {
      try {
        const result = await geocodeAddress(address);
        if (result && !result.error) {
          return { ...result, address };
        }
        errors.push({ 
          address, 
          error: result?.error || 'Geocoding failed',
          canRetry: !result?.error?.includes('Invalid')  // Only allow retry for non-validation errors
        });
        return null;
      } catch (error) {
        errors.push({ 
          address, 
          error: error.message,
          canRetry: true
        });
        return null;
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(Boolean));
    
    // Report progress
    onProgress?.(results.length, addresses.length, errors);
    
    // Delay between chunks to respect rate limits
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  return { results, errors };
}; 