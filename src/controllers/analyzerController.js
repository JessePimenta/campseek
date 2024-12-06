import { getUserCollection, getSupporters, findCommonReleases } from '../services/collectionService.js';

export async function analyzeCollections(req, res) {
  try {
    const { releaseUrl, profileUrl } = req.body;

    // Get user's collection
    const userCollection = await getUserCollection(profileUrl);

    // Get release supporters
    const supporters = await getSupporters(releaseUrl);

    // Analyze each supporter's collection
    const results = [];
    for (const supporter of supporters) {
      const supporterCollection = await getUserCollection(supporter.url);
      const commonReleases = findCommonReleases(userCollection, supporterCollection);
      
      if (commonReleases.length > 0) {
        results.push({
          name: supporter.name,
          url: supporter.url,
          commonCount: commonReleases.length,
          commonReleases
        });
      }
    }

    // Sort by number of common releases
    results.sort((a, b) => b.commonCount - a.commonCount);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}