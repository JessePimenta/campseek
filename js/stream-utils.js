export async function setupStream(url) {
    try {
        console.log('[Stream] Setting up stream for URL:', url);
        const response = await fetch('https://map.deejay.tools/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({ url }),
        });

        console.log('[Stream] Response status:', response.status);
        console.log('[Stream] Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            throw new Error(`Stream setup failed: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('No response body received from stream');
        }

        console.log('[Stream] Stream connection established successfully');
        return response.body;
    } catch (error) {
        console.error('[Stream] Stream setup error:', error);
        throw new Error(`Failed to connect to stream service: ${error.message}`);
    }
}