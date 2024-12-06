import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

async function fetchUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.text();
}

app.post('/analyze', async (req, res) => {
  try {
    const { releaseUrl, profileUrl } = req.body;
    console.log('Analyzing:', { releaseUrl, profileUrl });

    // Fetch release page
    const releaseHtml = await fetchUrl(releaseUrl);
    const release$ = cheerio.load(releaseHtml);
    
    // Get supporters
    const supporters = [];
    release$('.fan-name a').each((_, el) => {
      const supporterUrl = release$(el).attr('href');
      const name = release$(el).text().trim();
      if (supporterUrl && name) {
        supporters.push({ url: supporterUrl, name });
      }
    });

    console.log(`Found ${supporters.length} supporters`);

    // Get user's collection
    const profileHtml = await fetchUrl(profileUrl);
    const profile$ = cheerio.load(profileHtml);
    const userCollection = [];
    
    profile$('#collection-items .collection-item-container').each((_, el) => {
      const artist = profile$(el).find('.collection-item-artist').text().replace('by ', '').trim();
      const title = profile$(el).find('.collection-item-title').first().text().trim();
      if (artist && title) {
        userCollection.push({ artist, title });
      }
    });

    console.log(`User has ${userCollection.length} items in collection`);

    // Analyze first 10 supporters
    const results = [];
    for (const supporter of supporters.slice(0, 10)) {
      try {
        const supporterHtml = await fetchUrl(supporter.url);
        const supporter$ = cheerio.load(supporterHtml);
        const supporterCollection = [];

        supporter$('#collection-items .collection-item-container').each((_, el) => {
          const artist = supporter$(el).find('.collection-item-artist').text().replace('by ', '').trim();
          const title = supporter$(el).find('.collection-item-title').first().text().trim();
          if (artist && title) {
            supporterCollection.push({ artist, title });
          }
        });

        // Find common releases
        const commonReleases = userCollection.filter(item1 => 
          supporterCollection.some(item2 => 
            item1.artist === item2.artist && item1.title === item2.title
          )
        );

        if (commonReleases.length > 0) {
          results.push({
            name: supporter.name,
            url: supporter.url,
            commonCount: commonReleases.length,
            commonReleases
          });
        }
      } catch (error) {
        console.error(`Error processing supporter ${supporter.url}:`, error);
      }
    }

    results.sort((a, b) => b.commonCount - a.commonCount);
    res.json(results);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});