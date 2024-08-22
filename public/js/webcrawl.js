async function webCrawl(url, keyword) {
    let counter;
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Read the post content
        const postContent = $('.post-content').text();
        console.log('Post Content:', postContent);

        // Read all answers
        $('.post-content').each((index, element) => {
            const answer = $(element).text();
            console.log('Answer:', answer);
            if (answer.includes(keyword)) {
                const post = {
                    content: answer
                };
                const json = JSON.stringify(post);
                fs.appendFileSync(`${keyword}.json`, json + ',');
                moveFileToFolder(keyword);
                counter++;
                console.log('Counter:', counter);
            }
        });

        if (counter >= 30) {
            return;
        }

        // Follow pagination
        const nextPageLink = $('.pagination-next a').attr('href');
        if (nextPageLink) {
            const nextPageUrl = new URL(nextPageLink, url).href;
            await delay(getRandomDelay(1000, 5000));

            // Random delay between 1 to 5 seconds
            await webCrawl(nextPageUrl, keyword);

        }
    } catch (error) {
        console.error('Error while web crawling:', error);
    }
    console.log('webCrawl function executed successfully');
}

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function moveFileToFolder(keyword) {
    // Put into folder
    const folderPath = '/workers/keywords/';
    fs.mkdirSync(folderPath, { recursive: true });
    fs.renameSync(`./${keyword}.json`, `${folderPath}/${keyword}.json`);
    console.log('moveFileToFolder function executed successfully');
}

// Usage
const url = 'https://www.likera.com/forum/mybb/Forum-Bambi-Sleep-Cult';
const keyword = 'bambisleep';
webCrawl(url, keyword);
console.log('webCrawl function called successfully');
