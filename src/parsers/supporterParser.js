import * as cheerio from 'cheerio';

export function parseSupporters(html) {
  const $ = cheerio.load(html);
  const supporters = [];
  
  $('.fan-name a').each((i, el) => {
    supporters.push({
      name: $(el).text().trim(),
      url: $(el).attr('href')
    });
  });
  
  return supporters;
}