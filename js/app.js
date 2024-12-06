import { BandcampPlayer } from './player.js';
import { analyzeSupporters } from './analyzer.js';
import { LocationManager } from './location-manager.js';

export class BandcampAnalyzer {
    constructor() {
        this.map = L.map('map', {
            minZoom: 2,
            maxZoom: 18,
            maxBounds: [[-90,-180],[90,180]],
            maxBoundsViscosity: 1
        }).setView([20,0], 2);
        
        this.markers = [];
        this.markerCluster = L.markerClusterGroup({
            disableClusteringAtZoom: 4,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        this.player = new BandcampPlayer();
        this.playHistory = [];
        this.genreCounts = new Map();
        this.activeGenres = new Set();
        this.locationManager = new LocationManager();
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
        
        this.map.addLayer(this.markerCluster);

        this.defaultIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-dot"></div>',
            iconSize: [12, 12]
        });

        this.playingIcon = L.divIcon({
            className: 'custom-marker playing',
            html: '<div class="marker-dot"></div>',
            iconSize: [12, 12]
        });

        this.visitedIcon = L.divIcon({
            className: 'custom-marker visited',
            html: '<div class="marker-dot"></div>',
            iconSize: [12, 12]
        });

        this.player.onTrackEnded = () => this.playNext();
        this.player.onPlayStateChange = (isPlaying) => this.updatePlayingState(isPlaying);
    }

    updateStatus(message) {
        const status = document.getElementById('status');
        if (status) {
            status.innerHTML = `${message}<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>`;
        }
    }

    updateNowPlaying(purchase) {
        const nowPlaying = document.getElementById('nowPlaying');
        const image = nowPlaying.querySelector('img');
        const title = nowPlaying.querySelector('.now-playing-title');
        const artist = nowPlaying.querySelector('.now-playing-artist');
        const buyLink = nowPlaying.querySelector('.now-playing-buy');
        const playButton = nowPlaying.querySelector('.play-button path');

        image.src = purchase.imageUrl;
        title.textContent = purchase.title;
        artist.textContent = purchase.artist;
        buyLink.href = purchase.albumUrl;
        
        // Set initial play/pause state
        playButton.setAttribute('d', this.player.isPlaying ? 
            'M9 8.5h2v8H9v-8zm5 0h2v8h-2v-8z' : 
            'M16.5 12.5L10.5 16.5V8.5L16.5 12.5Z'
        );
        
        nowPlaying.classList.add('visible');
    }

    createMarker(purchase, location) {
        const adjustedLocation = this.locationManager.getPosition(location);
        
        const isCurrentTrack = purchase.albumUrl === this.player.currentTrack;
        const playButtonPath = isCurrentTrack && this.player.isPlaying ?
            'M9 8.5h2v8H9v-8zm5 0h2v8h-2v-8z' :
            'M16.5 12.5L10.5 16.5V8.5L16.5 12.5Z';
        
        const popupContent = `
            <div class="marker-popup">
                <img src="${purchase.imageUrl}" alt="${purchase.title}">
                <p><strong>${purchase.title}</strong></p>
                <p>${purchase.artist}</p>
                <p class='supporterLink'>from <a href="${purchase.firstSupporter.url}" target="_blank">${purchase.firstSupporter.name}'s collection</a></p>
                <button class="play-button" onclick="app.play('${purchase.albumUrl}')">
                    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g filter="url(#filter0_b_142_18800)">
                            <rect x="0.833984" y="0.5" width="24" height="24" rx="12" fill="#262626"/>
                            <rect x="1.00065" y="0.666667" width="23.6667" height="23.6667" rx="11.8333" stroke="#3A3A3A" stroke-width="0.333333"/>
                        </g>
                        <path d="${playButtonPath}" fill="white"/>
                    </svg>
                </button>
            </div>
        `;

        const marker = L.marker([adjustedLocation.lat, adjustedLocation.lng], { icon: this.defaultIcon });
        marker.bindPopup(popupContent, { closeButton: false });
        marker.albumUrl = purchase.albumUrl;
        marker.purchase = purchase;
        
        return marker;
    }

    updateMarkerStates() {
        this.markers.forEach(marker => {
            if (marker.albumUrl === this.player.currentTrack) {
                marker.setIcon(this.playingIcon);
            } else if (this.playHistory.includes(marker.albumUrl)) {
                marker.setIcon(this.visitedIcon);
            } else {
                marker.setIcon(this.defaultIcon);
            }
        });
    }

    updatePlayingState(isPlaying) {
        // Update all play buttons
        const playButtons = document.querySelectorAll('.play-button');
        playButtons.forEach(button => {
            const svg = button.querySelector('path');
            const isCurrentTrack = button.closest('.marker-popup')?.querySelector('img')?.src === document.querySelector('.now-playing img')?.src;
            
            if (isPlaying && isCurrentTrack) {
                svg.setAttribute('d', 'M9 8.5h2v8H9v-8zm5 0h2v8h-2v-8z');
            } else {
                svg.setAttribute('d', 'M16.5 12.5L10.5 16.5V8.5L16.5 12.5Z');
            }
        });

        // Update now playing button
        const nowPlayingButton = document.querySelector('.now-playing .play-button path');
        if (nowPlayingButton) {
            nowPlayingButton.setAttribute('d', isPlaying ? 
                'M9 8.5h2v8H9v-8zm5 0h2v8h-2v-8z' : 
                'M16.5 12.5L10.5 16.5V8.5L16.5 12.5Z'
            );
        }

        this.updateMarkerStates();
    }

    async play(albumUrl) {
        try {
            await this.player.play(albumUrl);
            const marker = this.markers.find(m => m.albumUrl === albumUrl);
            if (marker) {
                this.updateNowPlaying(marker.purchase);
                if (!this.playHistory.includes(albumUrl)) {
                    this.playHistory.push(albumUrl);
                }
                this.updateMarkerStates();
                marker.openPopup();
                this.map.panTo(marker.getLatLng());
            }
        } catch (error) {
            console.warn('Could not play track, skipping to next:', error);
            this.playNext();
        }
    }

    async analyze() {
        const releaseUrl = document.getElementById('releaseUrl').value.trim();
        if (!releaseUrl) {
            this.updateStatus('Please enter a release URL');
            return;
        }

        try {
            this.markerCluster.clearLayers();
            this.markers = [];
            this.playHistory = [];
            this.genreCounts.clear();
            this.activeGenres.clear();
            this.locationManager.clear();
            
            await analyzeSupporters(releaseUrl, (message, result) => {
                if (result) {
                    result.recentPurchases.forEach(purchase => {
                        if (purchase.location && purchase.genres) {
                            const marker = this.createMarker(purchase, purchase.location);
                            this.markers.push(marker);
                            this.markerCluster.addLayer(marker);
                            this.updateGenreTags(purchase.genres);
                        }
                    });
                } else {
                    this.updateStatus(message);
                }
            });

            if (this.markers.length === 0) {
                this.updateStatus('No geotagged releases found');
            } else {
                this.updateStatus(`Found ${this.markers.length} geotagged releases`);
            }
        } catch (error) {
            this.updateStatus(error.message);
            console.error(error);
        }
    }

    updateGenreTags(genres) {
        if (!genres || !genres.length) return;
        
        genres.forEach(genre => {
            this.genreCounts.set(genre, (this.genreCounts.get(genre) || 0) + 1);
        });

        const genreTagsContainer = document.getElementById('genreTags');
        genreTagsContainer.innerHTML = '';

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'tags-container';

        const sortedGenres = [...this.genreCounts.entries()]
            .sort((a, b) => b[1] - a[1]);

        const visibleTagsLimit = 16;
        const allTags = [];

        sortedGenres.forEach(([genre, count]) => {
            const pill = document.createElement('div');
            pill.className = 'genre-pill';
            if (this.activeGenres.has(genre)) {
                pill.classList.add('active');
            }
            pill.dataset.genre = genre;
            pill.innerHTML = `${genre} <span class="genre-count">${count}</span>`;
            pill.onclick = () => this.toggleGenreFilter(genre);
            allTags.push(pill);
        });

        const showTags = (limit) => {
            tagsContainer.innerHTML = '';
            allTags.slice(0, limit).forEach(tag => {
                tagsContainer.appendChild(tag);
            });

            if (allTags.length > visibleTagsLimit) {
                const toggleBtn = document.createElement('div');
                toggleBtn.className = 'genre-pill';
                toggleBtn.textContent = limit === visibleTagsLimit ? 
                    `View All (${allTags.length - visibleTagsLimit} more)` : 
                    'View Less';
                toggleBtn.onclick = () => showTags(limit === visibleTagsLimit ? allTags.length : visibleTagsLimit);
                tagsContainer.appendChild(toggleBtn);
            }
        };

        showTags(visibleTagsLimit);
        genreTagsContainer.appendChild(tagsContainer);
    }

    toggleGenreFilter(genre) {
        if (this.activeGenres.has(genre)) {
            this.activeGenres.delete(genre);
        } else {
            this.activeGenres.add(genre);
        }

        document.querySelectorAll('.genre-pill').forEach(pill => {
            if (pill.dataset.genre === genre) {
                pill.classList.toggle('active');
            }
        });

        this.updateMarkerVisibility();
    }

    updateMarkerVisibility() {
        if (this.activeGenres.size === 0) {
            this.markers.forEach(marker => {
                this.markerCluster.addLayer(marker);
            });
            return;
        }

        this.markers.forEach(marker => {
            const markerGenres = marker.purchase.genres || [];
            const hasMatchingGenre = markerGenres.some(genre => this.activeGenres.has(genre));
            
            if (hasMatchingGenre) {
                this.markerCluster.addLayer(marker);
            } else {
                this.markerCluster.removeLayer(marker);
            }
        });
    }

    async playNext() {
        if (!this.player.currentTrack || this.markers.length === 0) return;

        const currentMarker = this.markers.find(m => m.albumUrl === this.player.currentTrack);
        if (!currentMarker) return;

        const currentLatLng = currentMarker.getLatLng();
        
        const unplayedMarkers = this.markers
            .filter(m => !this.playHistory.includes(m.albumUrl))
            .map(m => ({
                marker: m,
                distance: currentLatLng.distanceTo(m.getLatLng())
            }))
            .sort((a, b) => a.distance - b.distance);

        const next = unplayedMarkers[0]?.marker;
        if (!next) {
            this.updateStatus('All available tracks have been played');
            return;
        }

        // Close all popups first
        this.markers.forEach(marker => {
            if (marker !== next) {
                marker.closePopup();
            }
        });

        // Pan to next marker and open its popup
        this.map.panTo(next.getLatLng());
        next.openPopup();
        
        // Play the track
        await this.play(next.albumUrl);
    }

    async playRandom() {
        if (this.markers.length === 0) return;

        const unplayedMarkers = this.markers.filter(m => !this.playHistory.includes(m.albumUrl));
        if (unplayedMarkers.length === 0) {
            this.updateStatus('All available tracks have been played');
            return;
        }

        const randomIndex = Math.floor(Math.random() * unplayedMarkers.length);
        const randomMarker = unplayedMarkers[randomIndex];

        // Close all popups first
        this.markers.forEach(marker => {
            if (marker !== randomMarker) {
                marker.closePopup();
            }
        });

        // Pan to random marker and open its popup
        this.map.panTo(randomMarker.getLatLng());
        randomMarker.openPopup();
        
        // Play the track
        await this.play(randomMarker.albumUrl);
    }
}