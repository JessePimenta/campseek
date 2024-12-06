import { parseCollection, parseSupporters, parseLocationFromTags, parseGenresFromTags } from "/js/parser.js";
import { setupStream } from "/js/stream-utils.js";
import { findLocation } from "/js/locations.js";

export async function analyzeSupporters(releaseUrl, progressCallback) {
    let reader = null;
    
    try {
        progressCallback('');
        console.log('[Analyzer] Initiating stream analysis for:', releaseUrl);
        
        const stream = await setupStream(releaseUrl);
        reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        progressCallback('');
        let resultCount = 0;

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.log('[Analyzer] Stream complete');
                progressCallback(`Analysis complete! Found ${resultCount} results.`);
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                
                const dataLine = line.split('\n').find(l => l.startsWith('data: '));
                if (!dataLine) continue;
                
                const data = dataLine.slice(6);
                if (data === ':' || !data) continue;

                try {
                    const json = JSON.parse(data);
                    
                    if (!json.release || !json.collected_by) {
                        console.log('[Analyzer] Invalid data structure:', json);
                        continue;
                    }

                    // Find coordinates using our location mapping
                    const locationString = json.release.location?.toLowerCase() || '';
                    const mappedLocation = findLocation(locationString);

                    if (!mappedLocation) {
                        console.log('[Analyzer] No mapped location found for:', locationString);
                        continue;
                    }

                    console.log('[Analyzer] Found mapped location:', mappedLocation, 'for:', locationString);

                    const purchase = {
                        artist: json.release.artist,
                        title: json.release.title,
                        imageUrl: json.release.image_url,
                        albumUrl: json.release.url,
                        location: {
                            lat: mappedLocation.lat,
                            lng: mappedLocation.lng,
                            name: mappedLocation.name
                        },
                        genres: json.release.genres || [],
                        firstSupporter: {
                            name: json.collected_by.name,
                            url: json.collected_by.bandcamp_url
                        }
                    };

                    console.log('[Analyzer] Created purchase object:', {
                        title: purchase.title,
                        location: purchase.location,
                        hasLocation: Boolean(purchase.location.lat && purchase.location.lng)
                    });

                    resultCount++;
                    progressCallback('newResult', {
                        name: json.collected_by.name,
                        url: json.collected_by.bandcamp_url,
                        recentPurchases: [purchase]
                    });

                } catch (error) {
                    console.error('[Analyzer] Error parsing stream data:', error);
                    console.log('[Analyzer] Problematic data:', data);
                }
            }
        }
    } catch (error) {
        console.error('[Analyzer] Stream analysis error:', error);
        progressCallback(`Analysis failed: ${error.message}`);
        throw error;
    } finally {
        if (reader) {
            try {
                reader.releaseLock();
                console.log('[Analyzer] Stream reader released');
            } catch (e) {
                console.warn('[Analyzer] Error releasing reader lock:', e);
            }
        }
    }
}