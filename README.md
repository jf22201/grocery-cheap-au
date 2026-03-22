## Design Decisions

### Scraping Strategy

New product additions use the Zyte API for reliable, fast scraping to give the user quick feedback.
Nightly price updates use a self-hosted headless browser container to minimise cost at scale.
This splits the two use cases by priority — latency for user-initiated actions, cost efficiency for background jobs.

### REST vs WebSockets

The API uses REST for the MVP since the worst case is sequentially scraping 2 products via Zyte, averaging under 10 seconds — acceptable for a polling or await-on-response approach.
WebSockets would add complexity without meaningful benefit at this scale.
If the product comparison limit increases or scraping time grows, parallelisation via `Promise.all()` or a switch to WebSockets are both viable next steps.

## Development Requirements

### Node.js v22.22.0

If not currently installed, head [here](https://nodejs.org/en/download)

or use install script if on Linux

```shell
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 22

# Verify the Node.js version:
node -v # Should print "v22.22.0".

# Verify npm version:
npm -v # Should print "10.9.4".
```

### AWS CLI

Grab AWS CLI tools if not installed on your development machine: [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Database

This project uses a single RDS PostgreSQL instance with two schemas for environment isolation:
- `dev_josh` (or your own name) — local development
- `main` — production

Set `DB_SCHEMA` in your `.env` to your dev schema name and `DATABASE_URL` to the shared RDS connection string.

#### Dev schema changes

Use `drizzle-kit push` to sync your schema directly to your dev schema without generating migration files:

```bash
npx drizzle-kit push
```

#### Generating migrations for prod

Always generate migrations with `DB_SCHEMA=main` so the SQL has no schema prefix issues:

```bash
DB_SCHEMA=main npx drizzle-kit generate
```

Review the generated file in `drizzle/`, then commit it alongside your code changes. The GitHub Action will apply it to prod on merge to main.

To apply manually:

```bash
DB_SCHEMA=main DATABASE_URL=<prod-url> npx drizzle-kit migrate
```

## Getting Started

First, make sure you are at repo root then install npm requirements

```bash
npm install
```

The backend is run on AWS Amplify, login to the AWS CLI with your credentials.

```bash
aws login
```

Then bootstrap the sandbox environment on AWS for the backend:

```bash
npx ampx sandbox
```

or to pass in your .env file to amplify sandbox:

```bash
npx dotenvx run --env-file=.env.local -- ampx sandbox
```

You should now see amplify_outputs.json in the project directory, you can now start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [https://localhost:3000](https://localhost:3000) with your browser to see the result.

## Troubleshooting

### SSL issues - WSL

This app requires https, by default npm run dev should launch the server using https. If running Next.js on WSL but using a Windows host web browser. You may need to move your CA certificates in ~/$USER/.local/share/mkcert/rootCA.pem over to the Windows host and add it as a trusted certificate to your browser.

### Push service errors

Check to see if GCM (Google cloud messaging is enabled on your browser)

### Not able to access env values in Amplify sandbox

Make sure to add any .env values to be used in the sandbox by setting secrets. Check [here](https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/) for more info:
