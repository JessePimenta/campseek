import * as cheerio from 'cheerio';

export function parseCollection(html) {
  const $ = cheerio.load(html);
  const items = [];
  
  $('#collection-items .collection-item-container').each((i, el) => {
    const $el = $(el);
    items.push({
      artist: $el.find('.collection-item-artist').text().replace('by ', '').trim(),
      title: $el.find('.collection-item-title').first().text().trim(),
      url: $el.find('.item-link').attr('href')
    });
  });
  
  return items;
}