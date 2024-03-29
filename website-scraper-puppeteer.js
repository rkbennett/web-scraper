import puppeteer from 'puppeteer-extra';
import logger from './logger.js';
import scrollToBottomBrowser from './browserUtils/scrollToBottom.js';

class PuppeteerPlugin {
        constructor ({
                launchOptions = {},
                scrollToBottom = null,
                blockNavigation = false,
                blockAdSense = true
        } = {}) {
                this.launchOptions = launchOptions;
                this.scrollToBottom = scrollToBottom;
                this.blockNavigation = blockNavigation;
                this.browser = null;
                this.headers = {};

                logger.info('init plugin', { launchOptions, scrollToBottom, blockNavigation, blockAdSense });
        }

        apply (registerAction) {
                registerAction('beforeStart', async () => {
                        this.browser = await puppeteer.launch(this.launchOptions);
                });

                registerAction('beforeRequest', async ({requestOptions}) => {
                        if (hasValues(requestOptions.headers)) {
                                this.headers = Object.assign({}, requestOptions.headers);
                        }
                        return {requestOptions};
                });

                registerAction('afterResponse', async ({response}) => {
                        const contentType = response.headers['content-type'];
                        const isHtml = contentType && contentType.split(';')[0] === 'text/html';
                        if (isHtml) {
                                const url = response.url;
                                const page = await this.browser.newPage();

                                await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");

                                if (hasValues(this.headers)) {
                                        logger.info('set headers to puppeteer page', this.headers);
                                        await page.setExtraHTTPHeaders(this.headers);
                                }

                                if (this.blockNavigation) {
                                        await blockNavigation(page, url);
                                }

                                await page.goto(
                                    url,
                                    { waitUntil: "load",
                                });

                                if (this.scrollToBottom) {
                                        await scrollToBottom(page, this.scrollToBottom.timeout, this.scrollToBottom.viewportN);
                                }

                                await page.evaluate(() => {
                                    const onetrust = Array.from(document.querySelectorAll('[id*="onetrust"]'));
                                    onetrust.forEach(element => element.remove());
                                    var cookieBtn = document.querySelector('#onetrust-accept-btn-handler');
                                    if(cookieBtn){
                                        cookieBtn.click();
                                    }
                                });
                                if (blockAdSense){
                                    const iframes = await page.$$('iframe');
                                    for (const iframe of iframes) {
                                        const frameBox = await iframe.boundingBox();
                                        const frameVisibility = await iframe.evaluate(frame => window.getComputedStyle(frame).getPropertyValue('visibility'));
                                        const frameDisplay = await iframe.evaluate(frame => window.getComputedStyle(frame).getPropertyValue('display'));
                                        const iframeWidthPromise = await iframe.getProperty('width');
                                        const iframeHeightPromise = await iframe.getProperty('height');
                                        var iframeWidth = await iframeWidthPromise.jsonValue();
                                        var iframeHeight = await iframeWidthPromise.jsonValue();
                                        if (iframeHeight == 0 || iframeWidth == 0 || frameVisibility === 'hidden' || frameDisplay === 'none') {
                                            await page.evaluate((frame) => frame.remove(), iframe);
                                        };
                                    };
                                };


                                await page.$$eval('link[rel="preload"]', (links) => {
                                  links.forEach((link) => {
                                    const href = link.getAttribute('href');
                                    const imagesrcset = link.getAttribute('imagesrcset');
                                    if ((href && !(href.startsWith('/css') || href.startsWith('/fonts') || href.startsWith('/images') || href.startsWith('/js'))) || imagesrcset && !(imagesrcset.startsWith('/css') || imagesrcset.startsWith('/fonts') || imagesrcset.startsWith('/images') || imagesrcset.startsWith('/js'))) {
                                      link.remove()
                                    }
                                  });
                                });


                                await page.$$eval('link[rel="prefetch"]', (links) => {
                                  links.forEach((link) => {
                                    const href = link.getAttribute('href');
                                    const imagesrcset = link.getAttribute('imagesrcset');
                                    if ((href && !(href.startsWith('/css') || href.startsWith('/fonts') || href.startsWith('/images') || href.startsWith('/js'))) || imagesrcset && !(imagesrcset.startsWith('/css') || imagesrcset.startsWith('/fonts') || imagesrcset.startsWith('/images') || imagesrcset.startsWith('/js'))) {
                                      link.remove()
                                    }
                                  });
                                });


                                await page.$$eval('link[rel="dns-prefetch"]', (links) => {
                                  links.forEach((link) => {
                                    const href = link.getAttribute('href');
                                    if ((href && !(href.startsWith('/css') || href.startsWith('/fonts') || href.startsWith('/images') || href.startsWith('/js')))) {
                                      link.remove()
                                    }
                                  });
                                });



                                await page.$$eval('link[rel="preconnect"]', (links) => {
                                  links.forEach((link) => {
                                    const href = link.getAttribute('href');
                                    if ((href && !(href.startsWith('/css') || href.startsWith('/fonts') || href.startsWith('/images') || href.startsWith('/js')))) {
                                      link.remove()
                                    }
                                  });
                                });




                                await page.$$eval('script:not([src])', (scripts, url) => {
                                  console.log(url);
                                  scripts.forEach((script) => {
                                    const code = script.innerHTML;
                                    if (code && (code.includes('https://') && !code.includes(url))) {
                                      script.remove();
                                    }
                                  });
                                })


                                await page.$$eval('script', (scripts) => {
                                  scripts.forEach((script) => {
                                    /*if (code && code.includes('https://')) {
                                      script.remove();
                                    console.log(script);*/
                                    script.remove();
                                  });
                                });




                                const content = await page.content();
                                content.includes("src=\"getuid");
                                await page.close();

                                // convert utf-8 -> binary string because website-scraper needs binary
                                return Buffer.from(content).toString('binary');
                        } else {
                                return response.body;
                        }
                });

                registerAction('afterFinish', () => this.browser && this.browser.close());
        }
}

function hasValues (obj) {
        return obj && Object.keys(obj).length > 0;
}


async function scrollToBottom (page, timeout, viewportN) {
        logger.info(`scroll puppeteer page to bottom ${viewportN} times with timeout = ${timeout}`);

        await page.evaluate(scrollToBottomBrowser, timeout, viewportN);
}

async function blockNavigation (page, url) {
        logger.info(`block navigation for puppeteer page from url ${url}`);

        page.on('request', req => {
                if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url() !== url) {
                        req.abort('aborted');
                } else {
                        req.continue();
                }
        });
        await page.setRequestInterception(true);
}

async function blockAdSense (page) {
        logger.info(`drop iframes with size of 0x0 or style of hidden (typically used for tracking iframes)`);
        const pageContent = page;
        const iframes = await page.$$('iframe');
}




export default PuppeteerPlugin;
