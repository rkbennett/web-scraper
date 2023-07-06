docker run -dit --cap-add=SYS_ADMIN --name testing -e DEPTH=3 -e URL=www.apple.com -e PROTO=https --rm -v /tmp:/scrape scraper
