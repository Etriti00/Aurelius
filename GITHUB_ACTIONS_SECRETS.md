# GitHub Actions Secrets Configuration

Copy and paste each of these into your GitHub repository's Settings → Secrets and variables → Actions → New repository secret

## Required Core Secrets

### SONAR_TOKEN
**Name:** `SONAR_TOKEN`
**Value:** 
```
[Paste your SonarCloud authentication token here]
```

### SONAR_HOST_URL
**Name:** `SONAR_HOST_URL`
**Value:** 
```
https://sonarcloud.io
```

## Enhanced Security & Quality Secrets

### SNYK_TOKEN
**Name:** `SNYK_TOKEN`
**Value:** 
```
[Paste your Snyk authentication token here]
```

### FOSSA_API_KEY
**Name:** `FOSSA_API_KEY`
**Value:** 
```
[Paste your FOSSA API key here]
```

### CODECOV_TOKEN
**Name:** `CODECOV_TOKEN`
**Value:** 
```
[Paste your Codecov upload token here]
```

## Additional Recommended Secrets

### GITHUB_TOKEN
**Name:** `GITHUB_TOKEN`
**Value:** 
```
[Automatically provided by GitHub - no action needed]
```
**Note:** This is automatically available in GitHub Actions

### NPM_TOKEN (for private packages)
**Name:** `NPM_TOKEN`
**Value:** 
```
[Paste your NPM access token here if using private packages]
```

### SLACK_WEBHOOK (for notifications)
**Name:** `SLACK_WEBHOOK`
**Value:** 
```
[Paste your Slack webhook URL for build notifications]
```

### DISCORD_WEBHOOK (alternative notifications)
**Name:** `DISCORD_WEBHOOK`
**Value:** 
```
[Paste your Discord webhook URL for build notifications]
```

---

## Quick Setup Guide

### 1. SonarCloud Setup
1. Go to https://sonarcloud.io
2. Login with GitHub
3. Import your repository
4. Go to My Account → Security → Generate Tokens
5. Generate token with "Execute Analysis" permission
6. Copy token to `SONAR_TOKEN`

### 2. Snyk Setup
1. Go to https://app.snyk.io
2. Login with GitHub
3. Go to Settings → General → Auth Token
4. Copy token to `SNYK_TOKEN`

### 3. FOSSA Setup
1. Go to https://app.fossa.com
2. Login with GitHub
3. Add your project
4. Go to Settings → API Keys → Create New Key
5. Copy key to `FOSSA_API_KEY`

### 4. Codecov Setup
1. Go to https://codecov.io
2. Login with GitHub
3. Add your repository
4. Go to Settings → General
5. Copy Upload Token to `CODECOV_TOKEN`

### 5. Slack Notifications (Optional)
1. Go to your Slack workspace
2. Create a new app or webhook
3. Copy webhook URL to `SLACK_WEBHOOK`

---

## Copy-Paste Ready List

```
Secret Name: SONAR_TOKEN
Secret Value: [Your SonarCloud token]

Secret Name: SONAR_HOST_URL  
Secret Value: https://sonarcloud.io

Secret Name: SNYK_TOKEN
Secret Value: [Your Snyk token]

Secret Name: FOSSA_API_KEY
Secret Value: [Your FOSSA key]

Secret Name: CODECOV_TOKEN
Secret Value: [Your Codecov token]

Secret Name: NPM_TOKEN
Secret Value: [Your NPM token - if needed]

Secret Name: SLACK_WEBHOOK
Secret Value: [Your Slack webhook - if wanted]

Secret Name: DISCORD_WEBHOOK
Secret Value: [Your Discord webhook - if wanted]
```

## Important Notes

✅ **Required for CI/CD:** SONAR_TOKEN, SONAR_HOST_URL
🔒 **Security Enhancement:** SNYK_TOKEN, FOSSA_API_KEY  
📊 **Coverage & Analytics:** CODECOV_TOKEN
📢 **Notifications:** SLACK_WEBHOOK, DISCORD_WEBHOOK
📦 **Private Packages:** NPM_TOKEN

- Never commit these values to your repository
- Keep tokens secure and rotate regularly
- All services offer free tiers for open source projects
- GitHub Actions will skip steps if optional secrets are missing