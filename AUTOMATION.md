# GitHub Automation Setup

This document outlines the comprehensive GitHub Actions automation and local development tools configured for this project.

## 🚀 Overview

The automation setup includes:

- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Code Quality**: Linting, formatting, and performance monitoring
- **Security Scanning**: Vulnerability detection and dependency updates
- **Commit Validation**: Enforcing conventional commit messages
- **Local Development**: Pre-commit hooks and automated formatting

## 📋 GitHub Actions Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)

**Triggers**: Push to `main`/`develop` branches, PRs to `main`

**Jobs**:
- **Lint and Test**: Runs ESLint, TypeScript checks, and builds on Node.js 18.x & 20.x
- **Security Scan**: Runs `npm audit` and Snyk security scanning
- **Deploy**: Automatically deploys to Vercel on successful `main` branch builds

**Required Secrets**:
```yaml
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }} # Optional
```

### 2. Commit Validation (`.github/workflows/commit-validation.yml`)

**Triggers**: Pull requests

**Validations**:
- Conventional commit message format using commitlint
- PR title follows semantic format
- PR size warnings for large changes
- Files and lines changed metrics

**Allowed Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Maintenance tasks
- `revert`: Reverting changes

### 3. Dependency Updates (`.github/workflows/dependency-update.yml`)

**Triggers**: Every Monday at 9 AM UTC, or manual dispatch

**Actions**:
- Updates npm packages to latest versions
- Fixes moderate security vulnerabilities
- Runs tests and linting
- Creates automated PR with dependency updates

### 4. Code Quality (`.github/workflows/code-quality.yml`)

**Triggers**: Push to `main`/`develop`, PRs to `main`

**Features**:
- **ESLint with GitHub PR reviews**: Code quality annotations directly in PRs
- **Bundle size monitoring**: Tracks JavaScript bundle sizes
- **Prettier formatting checks**: Ensures consistent code style
- **Lighthouse CI**: Performance, accessibility, and SEO testing

## 🔧 Local Development Setup

### Pre-commit Hooks with Husky

The project uses Husky for Git hooks and lint-staged for pre-commit checks:

1. **Automatic installation**: Run `npm install` to set up Git hooks
2. **Pre-commit actions**:
   - ESLint fixes for JS/TS files
   - Prettier formatting for all supported files
   - Lint-staged ensures only changed files are processed

### Available Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues automatically
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
npm run type-check      # Run TypeScript type checking

# Analysis
npm run analyze         # Analyze bundle size with @next/bundle-analyzer
npm run size-check      # Check bundle sizes with size-limit
```

## 📊 Configuration Files

### Size Limit (`.size-limit.json`)

Monitors bundle sizes to prevent performance regressions:

- Main bundle: 100 KB limit
- Home page: 50 KB limit
- Total JavaScript: 500 KB limit

### Lighthouse CI (`lighthouserc.js`)

Performance thresholds:
- Performance: 80+ (warning)
- Accessibility: 90+ (error)
- Best Practices: 80+ (warning)
- SEO: 80+ (warning)

### Prettier (`.prettierrc`)

Code formatting rules:
- No semicolons
- Single quotes
- Trailing commas (ES5)
- 100 character line width
- TailwindCSS plugin for class sorting

### Commitlint (`commitlint.config.js`)

Commit message rules:
- Conventional commit format required
- Subject max 50 characters
- Body lines max 72 characters
- No uppercase or start-case subjects

## 🎯 Best Practices

### Commit Messages

Follow the conventional commit format:
```
type(scope): description

[optional body]

[optional footer(s)]
```

Examples:
```bash
feat(auth): add user registration with email verification
fix(api): resolve timeout issue in data fetching
docs(readme): update installation instructions
chore(deps): update react to latest version
```

### Pull Requests

1. **Semantic titles**: Use conventional commit format for PR titles
2. **Descriptive descriptions**: Explain what and why, not just how
3. **Keep PRs focused**: One feature or fix per PR when possible
4. **Link issues**: Reference related issues with `fixes #123` or `closes #123`

### Code Quality

1. **Local testing**: Run `npm run lint` and `npm run type-check` before committing
2. **Bundle awareness**: Monitor bundle sizes when adding dependencies
3. **Performance first**: Test Lighthouse scores after significant changes
4. **Security updates**: Review dependency update PRs promptly

## 🚨 Required Setup

### GitHub Secrets

Add these secrets to your GitHub repository settings:

1. **Vercel Deployment**:
   - `VERCEL_TOKEN`: Your Vercel API token
   - `VERCEL_ORG_ID`: Vercel organization ID
   - `VERCEL_PROJECT_ID`: Vercel project ID

2. **Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Optional**:
   - `SNYK_TOKEN`: For advanced security scanning
   - `LHCI_GITHUB_APP_TOKEN`: For Lighthouse GitHub integration

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Git hooks are automatically configured via the `prepare` script

3. Configure your editor to use the project's Prettier and ESLint settings

## 🔍 Monitoring and Maintenance

### What to Monitor

1. **GitHub Actions**: Check workflow runs for failures
2. **Bundle sizes**: Watch for unexpected size increases
3. **Performance scores**: Monitor Lighthouse results
4. **Security alerts**: Review dependency vulnerability reports

### Regular Maintenance

1. **Dependency updates**: Automated PRs created weekly
2. **Workflow updates**: Review and update GitHub Actions monthly
3. **Threshold adjustments**: Update size limits and performance scores as needed

## 🐛 Troubleshooting

### Common Issues

1. **Husky hooks not working**:
   ```bash
   rm -rf .git/hooks
   npm run prepare
   ```

2. **Lint-staged failing**:
   - Check individual linting errors in the output
   - Run `npm run lint:fix` manually to see detailed errors

3. **Size limit failures**:
   - Run `npm run analyze` to identify large bundles
   - Consider code splitting or removing unused dependencies

4. **Lighthouse failures**:
   - Check the detailed report in workflow artifacts
   - Focus on the specific performance metrics that failed

### Getting Help

1. Check workflow logs in GitHub Actions tab
2. Review this documentation for configuration details
3. Refer to individual tool documentation for advanced issues

---

This automation setup ensures consistent code quality, security, and performance across all development and deployment stages. The tools work together to catch issues early and maintain high standards for the codebase.