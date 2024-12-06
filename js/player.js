export class BandcampPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentTrack = null;
        this.isPlaying = false;
        this.streamCache = new Map();
        this.failedTracks = new Set();
        this.onTrackEnded = null;
        this.onPlayStateChange = null;
        
        this.audio.addEventListener('error', () => {
            this.isPlaying = false;
            this.currentTrack = null;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        });

        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.currentTrack = null;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
            if (this.onTrackEnded) {
                this.onTrackEnded();
            }
        });

        this.audio.addEventListener('playing', () => {
            this.isPlaying = true;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(true);
            }
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        });
    }

    async getStreamUrl(url) {
        const cleanUrl = url.split('?')[0];
        
        if (this.failedTracks.has(cleanUrl)) {
            return null;
        }
        
        if (this.streamCache.has(cleanUrl)) {
            return this.streamCache.get(cleanUrl);
        }
        
        try {
            const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(cleanUrl));
            if (!response.ok) throw new Error('Failed to fetch page');
            
            const html = await response.text();
            let streamUrl = null;
            
            // Method 1: data-tralbum attribute
            const dataMatch = html.match(/data-tralbum="([^"]*)"/);
            if (dataMatch) {
                try {
                    const trackData = JSON.parse(
                        decodeURIComponent(dataMatch[1].replace(/&quot;/g, '"'))
                    );
                    streamUrl = trackData.trackinfo?.[0]?.file?.['mp3-128'];
                } catch (e) {
                    console.warn('Failed to parse data-tralbum:', e);
                }
            }

            // Method 2: TralbumData variable
            if (!streamUrl) {
                const tralbumMatch = html.match(/TralbumData\s*=\s*({[\s\S]*?});/);
                if (tralbumMatch) {
                    try {
                        const trackData = JSON.parse(tralbumMatch[1]);
                        streamUrl = trackData.trackinfo?.[0]?.file?.['mp3-128'];
                    } catch (e) {
                        console.warn('Failed to parse TralbumData:', e);
                    }
                }
            }

            // Method 3: mediaURLs
            if (!streamUrl) {
                const mediaMatch = html.match(/"mp3-128":"([^"]*)"/);
                if (mediaMatch) {
                    streamUrl = mediaMatch[1].replace(/\\u0026/g, '&');
                }
            }

            if (!streamUrl) {
                this.failedTracks.add(cleanUrl);
                return null;
            }

            this.streamCache.set(cleanUrl, streamUrl);
            return streamUrl;

        } catch (error) {
            console.warn('Error extracting stream URL:', error);
            this.failedTracks.add(cleanUrl);
            return null;
        }
    }

    async play(url) {
        try {
            if (this.currentTrack === url && this.isPlaying) {
                await this.pause();
                return;
            }

            const streamUrl = await this.getStreamUrl(url);
            if (!streamUrl) {
                throw new Error('NO_STREAM');
            }

            this.audio.pause();
            this.audio = new Audio();
            this.audio.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                this.audio.addEventListener('error', (e) => {
                    console.warn('Audio error:', e);
                    reject(new Error('NO_STREAM'));
                });

                this.audio.addEventListener('loadeddata', async () => {
                    try {
                        await this.audio.play();
                        this.currentTrack = url;
                        this.isPlaying = true;
                        if (this.onPlayStateChange) {
                            this.onPlayStateChange(true);
                        }
                        resolve();
                    } catch (e) {
                        reject(new Error('NO_STREAM'));
                    }
                });

                this.audio.src = streamUrl;
                this.audio.load();
            });

        } catch (error) {
            console.warn('Play error:', error);
            this.isPlaying = false;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
            throw error;
        }
    }

    async pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
            if (this.onPlayStateChange) {
                this.onPlayStateChange(false);
            }
        }
    }
}