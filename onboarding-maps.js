// Initialize variables
let map;
let marker;
let autocomplete;

// Initialize the map
function initMap() {
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
    mapTypeId: google.maps.MapTypeId.ROADMAP,
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
  
  // Get input element
  const input = document.getElementById("search-input");
  if (!input) {
    console.error("Search input not found");
    return;
  }
  
  // Create autocomplete - focus on child education establishments
  autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['establishment'],
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
  });
  
  // Handle selection from autocomplete
  autocomplete.addListener("place_changed", function() {
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
  });
  
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
              const input = document.getElementById("search-input");
              if (input) {
                input.value = place.name || place.formatted_address || results[0].formatted_address;
              }
              
              // Use the shared function to populate fields
              populateFields(place, isChildEducation);
            } else {
              // Fallback if place details not available
              const input = document.getElementById("search-input");
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
  
  // Helper function to check if a place is child education related
  function isChildEducationPlace(place) {
    // First check types (less reliable but good when available)
    if (place.types && (
      place.types.includes('school') || 
      place.types.includes('primary_school')
    )) {
      return true;
    }
    
    // Then check name (more reliable for specific child education institutions)
    if (place.name) {
      const name = place.name.toLowerCase();
      return name.includes('preschool') || 
             name.includes('pre-school') ||
             name.includes('kindergarten') || 
             name.includes('day care') || 
             name.includes('daycare') ||
             name.includes('montessori') ||
             name.includes('elementary') ||
             name.includes('primary school') ||
             name.includes('school') ||
             name.includes('academy') ||
             name.includes('education center') ||
             name.includes('learning center');
    }
    
    return false;
  }
  
  console.log("Map initialization complete");
}

// Extract and populate address components
function populateAddressComponents(components) {
  let street = "";
  let city = "";
  let state = "";
  let zip = "";
  let country = "";
  
  for (const component of components) {
    const componentType = component.types[0];
    
    switch (componentType) {
      case "street_number":
        street = component.long_name + " " + street;
        break;
      case "route":
        street = street + component.long_name;
        break;
      case "locality":
        city = component.long_name;
        break;
      case "administrative_area_level_1":
        state = component.short_name;
        break;
      case "postal_code":
        zip = component.long_name;
        break;
      case "country":
        country = component.long_name;
        break;
    }
  }
  
  updateFieldIfExists("street-address", street);
  updateFieldIfExists("city", city);
  updateFieldIfExists("state", state);
  updateFieldIfExists("zip", zip);
  updateFieldIfExists("country", country);
}

// Shared function to populate all form fields from place data
function populateFields(place, isChildEducation) {
  // Basic location fields
  updateFieldIfExists("address-result", place.formatted_address || "");
  
  // Extract and populate address components
  populateAddressComponents(place.address_components || []);
  
  // Contact information
  updateFieldIfExists("phone", place.formatted_phone_number || "");
  updateFieldIfExists("website", place.website || "");
  
  // Business details
  updateFieldIfExists("place-name", place.name || "");
  
  // Determine facility type based on place name and types
  let facilityType = "Educational Institution";
  
  if (place.name) {
    const name = place.name.toLowerCase();
    if (name.includes('preschool') || name.includes('pre-school'))
      facilityType = "Preschool";
    else if (name.includes('kindergarten'))
      facilityType = "Kindergarten";
    else if (name.includes('daycare') || name.includes('day care'))
      facilityType = "Day Care";
    else if (name.includes('montessori'))
      facilityType = "Montessori School";
    else if (name.includes('elementary') || name.includes('primary'))
      facilityType = "Elementary School";
  }
  
  if (place.types) {
    if (place.types.includes("primary_school"))
      facilityType = "Elementary School";
    else if (place.types.includes("school") && facilityType === "Educational Institution")
      facilityType = "School";
  }
  
  updateFieldIfExists("facility-type", facilityType);
  
  // Geographic coordinates
  if (place.geometry && place.geometry.location) {
    updateFieldIfExists("latitude", place.geometry.location.lat());
    updateFieldIfExists("longitude", place.geometry.location.lng());
  }
  
  // Additional data
  updateFieldIfExists("place-id", place.place_id || "");
  updateFieldIfExists("rating", place.rating || "");
  updateFieldIfExists("business-status", place.business_status || "");
  updateFieldIfExists("is-child-education", isChildEducation ? "Yes" : "No");
}

// Helper function to update field if it exists
function updateFieldIfExists(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

// Load Google Maps API after our initialization function is defined
const script = document.createElement('script');
script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCS2HPSaZanTmfQ79u84wuOHCpuakJNxYs&libraries=places&callback=initMap';
script.async = true;
script.defer = true;
document.head.appendChild(script); 