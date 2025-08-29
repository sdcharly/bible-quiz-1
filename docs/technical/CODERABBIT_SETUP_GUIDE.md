# CodeRabbit AI Code Review Setup Guide

## Overview
CodeRabbit is an AI-powered code review tool that automatically reviews pull requests, providing intelligent feedback to improve code quality. This guide will help you integrate CodeRabbit with your GitHub repository.

## Setup Steps

### 1. Sign Up and Authorization
1. Visit [CodeRabbit App](https://app.coderabbit.ai/login)
2. Click "Login with GitHub"
3. Authorize CodeRabbit to access your GitHub account
4. Grant the following permissions:
   - **Read-only**: Organizations, teams, email addresses
   - **Read/Write**: Code, commit statuses, issues, pull requests

### 2. Install CodeRabbit GitHub App
1. Go to [GitHub Marketplace - CodeRabbit](https://github.com/marketplace/coderabbit)
2. Click "Install"
3. Choose repository access:
   - **All repositories** - Grants access to all current and future repositories
   - **Only select repositories** - Select `simplequiz` repository specifically
4. Complete the installation

### 3. Create Configuration File
Create `.coderabbit.yaml` in the root of your repository:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: "en-US"
early_access: false
enable_free_tier: true

# Review Settings
reviews:
  profile: "chill"  # Options: chill, assertive, enthusiastic
  request_changes_workflow: false
  high_level_summary: true
  poem: false  # Disable whimsical poems in reviews
  review_status: true
  collapse_walkthrough: true
  
  # Path-specific instructions
  path_instructions:
    - path: "src/components/**"
      instructions: "Ensure all components follow shadcn/ui patterns and use proper TypeScript types"
    - path: "src/app/api/**"
      instructions: "Check for proper error handling, authentication, and database query optimization"
    - path: "src/lib/**"
      instructions: "Verify logger usage instead of console.log, check for performance optimizations"

# Auto Review Settings
auto_review:
  enabled: true
  drafts: false  # Don't review draft PRs

# Chat Settings
chat:
  auto_reply: true

# Knowledge Base
knowledge_base:
  learnings:
    scope: auto
  issues:
    scope: auto

# Tools Configuration
tools:
  eslint:
    enabled: true
  prettier:
    enabled: true
  typescript:
    enabled: true
  
# Custom Instructions
tone_instructions: |
  You are reviewing code for a Next.js TypeScript project with the following guidelines:
  - Ensure TypeScript types are properly defined
  - Check for proper use of React hooks and dependencies
  - Verify shadcn/ui components are used instead of raw HTML elements
  - Ensure logger utility is used instead of console statements
  - Check for proper error handling in API routes
  - Verify database queries use parameterized statements
  - Ensure no secrets or credentials are hardcoded

# Ignored Patterns
ignored_titles:
  - "WIP"
  - "DO NOT REVIEW"
  - "[skip-review]"

ignored_branches:
  - "experimental/*"
  - "temp/*"
```

### 4. Using CodeRabbit in Pull Requests

#### Automatic Reviews
- CodeRabbit automatically reviews every new PR and commit
- Reviews appear as comments directly in the PR

#### Manual Commands
Use these commands in PR comments:

- `@coderabbitai review` - Trigger a fresh review
- `@coderabbitai resolve` - Mark comments as resolved
- `@coderabbitai configuration` - Show current configuration
- `@coderabbitai help` - Show all available commands
- `@coderabbitai summary` - Generate a summary of the PR

#### Interactive Chat
Reply to CodeRabbit's comments to:
- Ask for clarification
- Request specific checks
- Get suggestions for improvements
- Ask about best practices

Example:
```
@coderabbitai Can you check if this API endpoint properly handles rate limiting?
```

### 5. Best Practices

#### For Your Project Specifically
1. **TypeScript Reviews**: CodeRabbit will check for proper typing and interface definitions
2. **React/Next.js**: Reviews hooks dependencies, SSR/CSR patterns, and performance
3. **API Security**: Checks authentication, SQL injection prevention, and error handling
4. **Code Style**: Enforces consistent formatting and naming conventions

#### Review Workflow
1. Create a PR with descriptive title and description
2. Wait for CodeRabbit's initial review (usually within 1-2 minutes)
3. Address feedback by:
   - Clicking "Commit Suggestion" for direct fixes
   - Discussing complex issues in comments
   - Pushing fixes which trigger re-review
4. Once satisfied, merge the PR

### 6. Advanced Features

#### Committable Suggestions
- CodeRabbit provides code suggestions you can commit directly
- Click "Commit Suggestion" button to apply changes instantly

#### Learning from Feedback
- CodeRabbit learns from your responses and adjusts future reviews
- Consistent feedback helps it understand your team's preferences

#### Security Scanning
- Automatic detection of security vulnerabilities
- Checks for exposed secrets, SQL injection risks, XSS vulnerabilities

### 7. Troubleshooting

#### CodeRabbit Not Reviewing
- Check if CodeRabbit app is installed for the repository
- Verify `.coderabbit.yaml` is in the main branch
- Ensure PR title doesn't match ignored patterns

#### Getting Better Reviews
- Add detailed PR descriptions
- Use conventional commit messages
- Provide context in your code comments

### 8. Pricing
- **Free**: Public repositories
- **Pro**: Private repositories (check current pricing at coderabbit.ai)
- **Team**: Advanced features and priority support

## Quick Start Checklist

- [ ] Sign up at [app.coderabbit.ai](https://app.coderabbit.ai/login)
- [ ] Install CodeRabbit GitHub App
- [ ] Add `.coderabbit.yaml` to repository
- [ ] Create a test PR to verify setup
- [ ] Configure team preferences in YAML file
- [ ] Train team on using @coderabbitai commands

## Resources
- [Official Documentation](https://docs.coderabbit.ai/)
- [Configuration Reference](https://docs.coderabbit.ai/reference/configuration)
- [GitHub Integration Guide](https://docs.coderabbit.ai/platforms/github-com)
- [Support](https://coderabbit.ai/support)

## Security & Privacy
- CodeRabbit doesn't store your code
- All LLM queries are ephemeral (in-memory only)
- Your code is never used to train models
- SOC 2 Type II compliant