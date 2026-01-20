# AWS Lambda Backend Playground

A complete AWS serverless application using **TypeScript**, AWS SAM with automated GitHub Actions deployment via OIDC.

## Architecture

- **Lambda Function** (Node.js 20, ARM64, TypeScript) with Function URL
- **DynamoDB Table** (Provisioned capacity: 1 RCU/WCU)
- **SSM Parameter Store** for secrets management
- **GitHub Actions** deployment with AWS OIDC (no stored credentials)

## Project Structure

```
.
├── template.yaml              # SAM template
├── src/
│   ├── handler.ts            # Lambda function handler (TypeScript)
│   ├── package.json          # Lambda dependencies & build script
│   └── tsconfig.json         # TypeScript config for Lambda
├── seed/
│   └── items.json            # Sample DynamoDB data
├── scripts/
│   ├── seed.ts               # Database seeding script (TypeScript)
│   ├── package.json          # Seed script dependencies
│   └── tsconfig.json         # TypeScript config for scripts
├── bootstrap/
│   └── github-oidc.yaml      # CloudFormation for OIDC setup
└── .github/
    └── workflows/
        └── deploy.yaml       # GitHub Actions workflow
```

## Setup Instructions

### 1. Bootstrap AWS OIDC Provider

First, create the OIDC provider and IAM role for GitHub Actions:

```bash
aws cloudformation deploy \
  --template-file bootstrap/github-oidc.yaml \
  --stack-name github-oidc-provider \
  --parameter-overrides \
    GitHubOrg=<YOUR_GITHUB_ORG> \
    GitHubRepo=<YOUR_REPO_NAME> \
    GitHubBranch=main \
  --capabilities CAPABILITY_NAMED_IAM
```

Get the Role ARN from stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name github-oidc-provider \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text
```

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add new repository secret:
   - Name: `AWS_ROLE_TO_ASSUME`
   - Value: `<ROLE_ARN_FROM_STEP_1>`

3. (Optional) Add your LLM API key:
   - Name: `LLM_API_KEY`
   - Value: `<YOUR_API_KEY>`

### 3. Deploy

Push to the `main` (or `master`) branch to trigger automatic deployment:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

Or manually trigger via GitHub Actions:
- Go to **Actions** tab → **Deploy to AWS** → **Run workflow**

### 4. Test the Deployment

After deployment completes, the Function URL will be printed in the workflow logs.

Test the endpoint:

```bash
# GET request
curl https://<FUNCTION_URL>/

# POST request
curl -X POST https://<FUNCTION_URL>/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Expected response:
```json
{
  "message": "hello world",
  "method": "GET",
  "path": "/"
}
```

### 5. Verify DynamoDB Data

Check that seed data was inserted:

```bash
aws dynamodb scan --table-name llm-playground-requests
```

## Local Development

### Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Node.js 20](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/)

### Build and Test Locally

```bash
# Install dependencies
cd src
npm install

# Build TypeScript
npm run build

# Build SAM
cd ..
sam build

# Test locally
sam local invoke HelloFunction

# Start local API
sam local start-api

# Deploy manually
sam deploy --guided
```

### Seed Data Locally

```bash
# Build and run seed script
cd scripts
npm install
npm run build
node seed.js <TABLE_NAME>
```

## Configuration

### Update Stack Name

Edit [.github/workflows/deploy.yaml](.github/workflows/deploy.yaml):

```yaml
env:
  STACK_NAME: llm-playground  # Change this
```

### Update AWS Region

Edit [.github/workflows/deploy.yaml](.github/workflows/deploy.yaml):

```yaml
env:
  AWS_REGION: us-east-1  # Change this
```

### Adjust Lambda Configuration

Edit [template.yaml](template.yaml) under `Globals.Function`:

```yaml
Globals:
  Function:
    Timeout: 15      # seconds
    MemorySize: 256  # MB
```

## Cost Estimation

With the default configuration:
- **Lambda**: ~$0.20/million requests (ARM64 pricing)
- **DynamoDB**: ~$0.60/month (1 RCU + 1 WCU provisioned)
- **SSM Parameter**: Free (Standard tier)
- **Function URL**: Free

**Total**: ~$0.60-$1.00/month for low-traffic applications

## Security Notes

⚠️ **Production Recommendations**:

1. Replace `AdministratorAccess` in [bootstrap/github-oidc.yaml](bootstrap/github-oidc.yaml) with least-privilege permissions
2. Enable AWS CloudTrail for audit logging
3. Add Lambda function logging with CloudWatch Logs
4. Consider using AWS Secrets Manager for sensitive data instead of SSM Parameter Store
5. Enable DynamoDB Point-in-Time Recovery (PITR) for production tables
6. Add API Gateway with authentication for production use instead of public Function URLs

## Troubleshooting

### Deployment Fails

Check GitHub Actions logs for errors. Common issues:
- OIDC role ARN incorrect in GitHub secrets
- Insufficient IAM permissions
- Stack name conflicts

### Function URL Not Working

Ensure CORS is configured correctly in [template.yaml](template.yaml):

```yaml
FunctionUrlConfig:
  AuthType: NONE
  Cors:
    AllowOrigins: ['*']
```

### Seed Script Fails

Ensure AWS credentials are configured and table exists:

```bash
aws dynamodb describe-table --table-name llm-playground-requests
```

## License

MIT
