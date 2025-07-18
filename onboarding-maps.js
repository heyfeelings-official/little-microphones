// Initialize variables
let map;
let marker;
let autocomplete;

// Make initMap globally available for Google Maps callback
window.initMap = function() {
  console.log("Map initialization started");
  
  // Get map container
  const mapContainer = document.getElementById("map-container");
  if (!mapContainer) {
    console.error("Map container not found");
    return;
  }
  
  // Create map with all controls disabled
  map = new google.maps.Map(mapContainer, {
    center: { lat: 40.7128, lng: -74.0060 },
    zoom: 12,
    // Disable all controls
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: false,
    streetViewControl: false,
    rotateControl: false,
    scaleControl: false,
    mapTypeId: 'roadmap', // Use string instead of constant
    // Set styles to hide non-education POIs on the map
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.school",
        elementType: "labels",
        stylers: [{ visibility: "on" }]
      }
    ]
  });
  
  // Create marker
  marker = new google.maps.Marker({
    map: map,
    visible: false
  });
  
  console.log("Map initialized successfully");
  
  // Initialize autocomplete
  initAutocomplete();
  
  // Add click listener to map
  map.addListener("click", function(event) {
    // Set marker to clicked position
    marker.setPosition(event.latLng);
    marker.setVisible(true);
    
    // Use Geocoder to get address from coordinates
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: event.latLng }, function(results, status) {
      if (status === "OK" && results[0]) {
        // Get place details to update all fields
        const placesService = new google.maps.places.PlacesService(map);
        placesService.getDetails(
          {
            placeId: results[0].place_id,
            fields: [
              'place_id',
              'geometry',
              'name',
              'formatted_address',
              'address_components',
              'formatted_phone_number',
              'website',
              'types',
              'business_status',
              'rating'
            ]
          }, 
          function(place, status) {
            if (status === "OK" && place) {
              // Check if this is a child education establishment
              const isChildEducation = isChildEducationPlace(place);
              
              // Update input field with place name
              const input = document.getElementById("school-search") || 
                           document.getElementById("search-input") || 
                           document.getElementById("school-search-input");
              if (input) {
                input.value = place.name || place.formatted_address || results[0].formatted_address;
              }
              
              // Use the shared function to populate fields
              populateFields(place, isChildEducation);
            } else {
              // Fallback if place details not available
              const input = document.getElementById("school-search") || 
                           document.getElementById("search-input") || 
                           document.getElementById("school-search-input");
              if (input) {
                input.value = results[0].formatted_address;
              }
              
              // Populate with basic information
              updateFieldIfExists("address-result", results[0].formatted_address || "");
              
              // Extract and populate address components
              populateAddressComponents(results[0].address_components || []);
              
              // Set coordinates
              updateFieldIfExists("latitude", event.latLng.lat());
              updateFieldIfExists("longitude", event.latLng.lng());
            }
          }
        );
      }
    });
  });
};

// Initialize autocomplete
function initAutocomplete() {
  // Get input element - try multiple possible IDs
  const searchInput = document.getElementById("school-search") || 
                      document.getElementById("search-input") || 
                      document.getElementById("school-search-input") ||
                      document.querySelector('input[type="text"]'); // fallback to first text input
  
  if (!searchInput) {
    console.error("Search input not found - tried IDs: school-search, search-input, school-search-input");
    return;
  }
  
  console.log("Search input found:", searchInput.id || searchInput.className);

  // Initialize autocomplete
  autocomplete = new google.maps.places.Autocomplete(searchInput, {
    fields: ["formatted_address", "geometry", "name", "place_id", "types", "address_components", "website", "formatted_phone_number", "rating"],
    types: ['school', 'university', 'establishment']
  });

  // Add listener for place selection
  autocomplete.addListener("place_changed", onPlaceChanged);
  
  console.log("Autocomplete initialized");
}

// Handle selection from autocomplete
function onPlaceChanged() {
  const place = autocomplete.getPlace();
  console.log("Place selected:", place);
  
  if (!place.geometry || !place.geometry.location) {
    console.error("No geometry for selected place");
    return;
  }
  
  // Check if this is a child education establishment
  const isChildEducation = isChildEducationPlace(place);
  
  // Center map on selection
  map.setCenter(place.geometry.location);
  map.setZoom(15);
  
  // Show marker
  marker.setPosition(place.geometry.location);
  marker.setVisible(true);
  
  // Use the shared function to populate fields
  populateFields(place, isChildEducation);
}

// Helper function to check if a place is child education related
function isChildEducationPlace(place) {
  // First check types (less reliable but good when available)
  if (place.types && (
    place.types.includes('primary_school') ||
    place.types.includes('school') ||
    place.types.includes('secondary_school') ||
    place.types.includes('elementary_school') ||
    place.types.includes('kindergarten') ||
    place.types.includes('preschool')
  )) {
    return true;
  }
  
  // Then check the name for education-related keywords
  if (place.name) {
    const name = place.name.toLowerCase();
    return name.includes('school') ||
           name.includes('academy') ||
           name.includes('preschool') ||
           name.includes('kindergarten') ||
           name.includes('elementary') ||
           name.includes('primary') ||
           name.includes('middle school') ||
           name.includes('high school') ||
           name.includes('daycare') ||
           name.includes('montessori') ||
           name.includes('education center') ||
           name.includes('learning center');
  }
  
  return false;
}

// Extract and populate address components
function populateAddressComponents(components) {
  let street = "";
  let city = "";
  let state = "";
  let zip = "";
  let country = "";
  
  // Extract components
  components.forEach(component => {
    const types = component.types;
    
    if (types.includes("street_number") || types.includes("route")) {
      street += component.long_name + " ";
    }
    if (types.includes("locality")) {
      city = component.long_name;
    }
    if (types.includes("administrative_area_level_1")) {
      state = component.short_name || component.long_name;
    }
    if (types.includes("postal_code")) {
      zip = component.long_name;
    }
    if (types.includes("country")) {
      country = component.long_name;
    }
  });
  
  // Update fields
  updateFieldIfExists("street-address", street.trim());
  updateFieldIfExists("city", city);
  updateFieldIfExists("state", state);
  updateFieldIfExists("zip", zip);
  updateFieldIfExists("country", country);
}

// Populate all fields with place data
function populateFields(place, isChildEducation) {
  // Update address result
  updateFieldIfExists("address-result", place.formatted_address || "");
  
  // Update name
  updateFieldIfExists("place-name", place.name || "");
  
  // Update search input
  updateFieldIfExists("school-search", place.name || place.formatted_address || "");
  updateFieldIfExists("search-input", place.name || place.formatted_address || "");
  updateFieldIfExists("school-search-input", place.name || place.formatted_address || "");
  
  // Update place ID
  updateFieldIfExists("place-id", place.place_id || "");
  
  // Update facility type
  if (isChildEducation) {
    updateFieldIfExists("facility-type", "School/Education Facility");
  } else {
    updateFieldIfExists("facility-type", "Other/Non-Education");
  }
  
  // Extract and populate address components
  if (place.address_components) {
    populateAddressComponents(place.address_components);
  }
  
  // Update phone
  updateFieldIfExists("phone", place.formatted_phone_number || "");
  
  // Update website
  updateFieldIfExists("website", place.website || "");
  
  // Update rating
  updateFieldIfExists("school-rating", place.rating ? place.rating.toString() : "");
  
  // Update coordinates
  if (place.geometry && place.geometry.location) {
    updateFieldIfExists("latitude", place.geometry.location.lat());
    updateFieldIfExists("longitude", place.geometry.location.lng());
  }
}

// Helper function to update field if it exists
function updateFieldIfExists(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

// Load Google Maps API - Simple approach that works
// Check if script already exists
const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
if (!existingScript) {
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCS2HPSaZanTmfQ79u84wuOHCpuakJNxYs&libraries=places&callback=initMap';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
} 