export async function fetchTaggedReleases(tag) {
    // Use Bandcamp's discover API endpoint
    const url = `https://bandcamp.com/api/discover/3/get_web?g=${encodeURIComponent(tag)}&s=top&p=1&gn=0&f=all&w=0`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch releases for tag: ${tag}`);
        }

        const data = await response.json();
        console.log('[Tag Debug] API Response:', data);

        // Extract releases from the API response
        const releases = data.items.map(item => ({
            title: item.title,
            artist: item.artist,
            genre: item.genre,
            url: item.tralbum_url,
            imageUrl: item.art_id ? `https://f4.bcbits.com/img/a${item.art_id}_2.jpg` : null
        }));

        return releases;
    } catch (error) {
        console.error('Error fetching tagged releases:', error);
        throw new Error('Failed to fetch releases. Please try again.');
    }
}

export function isValidInput(input) {
    if (!input || typeof input !== 'string') return false;
    return input.startsWith('http') || input.length > 0;
}