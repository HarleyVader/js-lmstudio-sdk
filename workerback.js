const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebsite(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data, {
            xmlMode: true,
            decodeEntities: true
        });
        let paragraphs = [];
        
        $('p').each((i, elem) => {
            if (!$(elem).closest('a').length && !$(elem).find('a').length) {
                paragraphs.push($(elem).text().trim());
            }
        });
        
        // Filter out paragraphs that are too short or potentially contain code
        const cleanParagraphs = paragraphs.filter(p => {
            const words = p.split(/\s+/); // Split by whitespace to count words
            const isCodeSnippet = /<[^>]+>|function|var|let|const|document\.|window\.|\.css\(|\.html\(|\.append\(/.test(p);
            return words.length > 2 && !isCodeSnippet;
        });
        
        const finalData = cleanParagraphs.join('\n\n');
        return finalData;
    } catch (error) {
        console.error('Error scraping website:', error);
        return '';
    }
}

scrapeWebsite('https://brandynette.xxx').then(data => {
    console.log(data);
});