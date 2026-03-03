#compile into js first
FROM public.ecr.aws/lambda/nodejs:22 as builder
USER root
WORKDIR /app
COPY amplify/db/ ./amplify/db/
COPY collector/package.json ./package.json
COPY collector/tsconfig.json ./tsconfig.json
COPY collector/nightly-price-scrape ./collector/nightly-price-scrape
COPY collector/parsers ./collector/parsers
COPY collector/scrapers ./collector/scrapers
RUN npm install
RUN npx tsc
#now create image using compiled
FROM ghcr.io/puppeteer/puppeteer:22
WORKDIR /app
COPY --chown=pptruser:pptruser --from=builder /app/package*.json ./
RUN npm install --only=production
COPY --chown=pptruser:pptruser --from=builder /app/dist/amplify/db/ ./amplify/db/
#copy compiled js
COPY --chown=pptruser:pptruser --from=builder /app/dist/collector/ ./collector/
USER pptruser
CMD ["node", "collector/nightly-price-scrape/nightly-price-scrape.js"]