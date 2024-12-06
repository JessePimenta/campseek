import { findLocation } from './locations.js';

export function parseCollection(html, limit = 12) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items = [];
    
    doc.querySelectorAll('.collection-item-container').forEach(el => {
        const artist = el.querySelector('.collection-item-artist')?.textContent.replace('by ', '').trim();
        const title = el.querySelector('.collection-item-title')?.textContent
            .replace('(gift given)', '')
            .trim();
        const imageUrl = el.querySelector('.collection-item-art')?.src;
        const albumUrl = el.querySelector('.item-link')?.href?.split('?')[0];
        
        if (artist && title && albumUrl) {
            items.push({ artist, title, imageUrl, albumUrl });
        }
    });
    
    return items.slice(0, limit);
}

export function parseSupporters(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const supporters = new Set();
    
    const selectors = [
        '.collectors-grid a[href*="/bandcamp.com"]',
        '.fan-name a[href*="/bandcamp.com"]',
        '.collected-by a[href*="/bandcamp.com"]'
    ];
    
    selectors.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => {
            const url = el.href.split('?')[0];
            const name = el.textContent.trim();
            
            if (url && name && 
                !url.includes('/album/') && 
                !url.includes('/track/') && 
                !url.includes('/download/')) {
                supporters.add(JSON.stringify({ name, url }));
            }
        });
    });
    
    return [...supporters]
        .map(s => JSON.parse(s))
        .slice(0, 20);
}

export function parseLocationFromTags(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tags = doc.querySelectorAll('.tralbum-tags a.tag');
    
    for (const tag of tags) {
        const text = tag.textContent.trim();
        const location = findLocation(text);
        if (location) {
            return location;
        }
    }
    
    return null;
}

export function parseGenresFromTags(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tags = doc.querySelectorAll('.tralbum-tags a.tag');
    const genres = [];
    
    for (const tag of tags) {
        const text = tag.textContent.trim().toLowerCase();
        if (!findLocation(text)) {
            genres.push(text);
        }
    }
    
    return genres;
}