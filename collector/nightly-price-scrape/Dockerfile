FROM ghcr.io/puppeteer/puppeteer:22
WORKDIR /app
COPY --chown=pptruser:pptruser collector/package*.json ./
RUN npm install --only=production
COPY --chown=pptruser:pptruser amplify/db/ ./amplify/db/
#copy compiled js
COPY --chown=pptruser:pptruser collector/ ./collector/
USER pptruser
CMD ["npx", "tsx", "collector/nightly-price-scrape/nightly-price-scrape.ts"]