const Geo = {
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) { reject(new Error("Géolocalisation non supportée.")); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => { const m = { 1: "Permission refusée. Activez la géolocalisation.", 2: "Position indisponible.", 3: "Délai dépassé." }; reject(new Error(m[err.code] || err.message)); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  },
  distanceKm(a, b) {
    const R = 6371, toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  },
  formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }
};
window.Geo = Geo;
