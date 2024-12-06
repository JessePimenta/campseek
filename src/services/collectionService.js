import fetch from 'node-fetch';
import { parseCollection } from '../parsers/collectionParser.js';
import { parseSupporters } from '../parsers/supporterParser.js';

export async function getUserCollection(profileUrl) {
  const response = await fetch(profileUrl);
  const html = await response.text();
  return parseCollection(html);
}

export async function getSupporters(releaseUrl) {
  const response = await fetch(releaseUrl);
  const html = await response.text();
  return parseSupporters(html);
}

export function findCommonReleases(collection1, collection2) {
  return collection1.filter(item1 => 
    collection2.some(item2 => 
      item1.artist === item2.artist && item1.title === item2.title
    )
  );
}