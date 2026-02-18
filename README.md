## Development Requirements

### Node.js v22.22.0

If not currently installed, head to https://nodejs.org/en/download

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

Grab AWS CLI tools if not installed on your development machine: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

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
