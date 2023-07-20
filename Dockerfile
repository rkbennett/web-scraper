FROM node:19-bullseye
RUN mkdir /app
WORKDIR /app
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
ENV CHROME_DEVEL_SANDBOX=/usr/local/sbin/chrome
ENV DEPTH=0
RUN npm install && \
    apt-get update && \
    apt install libnss3-dev libatk1.0-0 ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
        libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
        libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils chromium -y
COPY index.js /app/index.js
COPY website-scraper-puppeteer.js /app/node_modules/website-scraper-puppeteer/lib/index.js
USER node
RUN mkdir -p /home/node/.config/chromium/Crash\ Reports/pending/
WORKDIR /app
ENTRYPOINT nodejs index.js
