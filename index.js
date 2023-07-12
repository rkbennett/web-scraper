// index.js
//const scrape = import('website-scraper');
//const PuppeteerPlugin = import('website-scraper-puppeteer');
import scrape from 'website-scraper';
import PuppeteerPlugin from 'website-scraper-puppeteer';
//const path = require('path');

function endsWithAny(suffixes, string) {
    return suffixes.some(function (suffix) {
        return string.endsWith(suffix);
    });
}

console.log("Scraping: " + process.env.PROTO + '://' + process.env.URL + '/');
console.log("Depth: " + process.env.DEPTH);
scrape({
    // Provide the URL(s) of the website(s) that you want to clone
    // In this example, you can clone the Our Code World website
    //urls: ['https://www.apple.com/'],
    urls: [process.env.PROTO + '://' + process.env.URL + '/'],
    urlFilter: (url) => !(endsWithAny(['.mp4', '.mp3', '.mpeg'], url)),
    // Specify the path where the content should be saved
    // In this case, in the current directory inside the ourcodeworld dir
    //directory: '/tmp/www.apple.com',
    directory: '/scrape/' + process.env.URL,
    maxRecursiveDepth: process.env.DEPTH,
    recursive: Boolean(parseInt(process.env.DEPTH)),
    requestConcurrency: 30,
    // Load the Puppeteer plugin
    plugins: [ 
        new PuppeteerPlugin({
            launchOptions: { headless: true }, /* optional */
            // launchOptions: { headless: true, args: ["--no-sandbox","--no-zygote"] }, /* optional */
            scrollToBottom: { 
		timeout: 10000,
                viewportN: 10
            }, /* optional */
            blockNavigation: true,
	    evaluatePage: async(page) => {
                const iframes = await page.$$('iframe');
                for (const iframe of iframes) {
		    console.log(iframe);
                    const iframeWidth = await iframe.getProperty('width').jsonValue();
                    const iframeHeight = await iframe.getProperty('height').jsonValue();
                    const iframeVisibility = await iframe.getProperty('style').then(style => style.jsonValue().visibility);
		    console.log(iframeHeight);
		    console.log(iframeWidth);
                    if ((iframeWidth === 0 && iframeHeight === 0) || iframeVisibility === 'hidden') {
                        await iframe.evaluate((iframe) => iframe.remove());
	            }
		}
	    }
        })
    ]
});

