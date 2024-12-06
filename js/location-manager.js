export class LocationManager {
    constructor() {
        this.locationGroups = new Map();
        this.baseSpacing = 0.1111; // Base spacing between markers
    }

    getOffset(lat, lng, index) {
        // Spiral formula parameters
        const angle = index * 2.4; // Golden angle in radians
        const radius = Math.sqrt(index) * this.baseSpacing;
        
        // Calculate spiral offset
        const offsetLat = radius * Math.cos(angle);
        const offsetLng = radius * Math.sin(angle) * Math.cos(lat * Math.PI / 180);
        
        return {
            lat: lat + offsetLat,
            lng: lng + offsetLng
        };
    }

    getPosition(location) {
        const key = `${location.lat},${location.lng}`;
        
        if (!this.locationGroups.has(key)) {
            this.locationGroups.set(key, []);
        }
        
        const group = this.locationGroups.get(key);
        const index = group.length;
        group.push(true);
        
        if (index === 0) {
            return location;
        }
        
        return this.getOffset(location.lat, location.lng, index);
    }

    clear() {
        this.locationGroups.clear();
    }
}