# CodeRabbit Integration for Windsurf IDE

## Overview
CodeRabbit's AI code review is now available directly inside Windsurf IDE. This guide shows how to install and configure the CodeRabbit extension for local code reviews.

## Installation Methods

### Method 1: Direct VSIX Installation (Recommended)

1. **Download the VSIX file**:
   ```bash
   # Download CodeRabbit VSIX directly
   curl -L -o coderabbit.vsix "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/CodeRabbit/vsextensions/coderabbit-vscode/0.13.5/vspackage"
   ```

2. **Install in Windsurf**:
   - Open Windsurf IDE
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: "Extensions: Install from VSIX..."
   - Navigate to the downloaded `coderabbit.vsix` file
   - Click Install

### Method 2: Using Windsurf VSIX Tool

1. **Install the VSIX tool**:
   ```bash
   git clone https://github.com/twotreeszf/windsurf-vsix-tool
   cd windsurf-vsix-tool
   ```

2. **Use the tool to install CodeRabbit**:
   - Follow the tool's instructions to download and install extensions
   - Search for "CodeRabbit" when prompted

### Method 3: From Open VSX Registry

Since Windsurf can't access Microsoft's marketplace directly:

1. **Check Open VSX**:
   - Visit: https://open-vsx.org/extension/coderabbit/coderabbit-vscode
   - Download the VSIX if available
   - Install using Method 1 steps

## Configuration

### 1. Initial Setup

After installation:
1. Open the CodeRabbit sidebar (look for CodeRabbit icon in activity bar)
2. Sign in with your CodeRabbit account
3. Link to your GitHub account if not already done

### 2. Extension Settings

Access settings:
- Click the gear icon in CodeRabbit sidebar, OR
- Press `Cmd+Shift+P` and search "CodeRabbit: Settings"

Configure these options:

```json
{
  // AI Agent Integration
  "coderabbit.aiAgent": "native",  // Options: native, clipboard, claude-code, etc.
  
  // Automatic Review Behavior
  "coderabbit.autoReview": "prompt",  // Options: disabled, prompt, auto
  
  // Self-hosted (if applicable)
  "coderabbit.selfHostedUrl": ""  // Leave empty for cloud version
}
```

### 3. Authentication

1. **First time setup**:
   - Click "Sign In" in the CodeRabbit sidebar
   - Authenticate with GitHub
   - Authorize repository access

2. **Verify connection**:
   - The extension should show "Connected" status
   - Your repository should appear in the dropdown

## Usage in Windsurf

### Review Uncommitted Changes

1. Make code changes in your project
2. Open CodeRabbit sidebar
3. Click "Review Changes" or use command palette: "CodeRabbit: Review Changes"
4. View AI-powered feedback inline

### Review Before Commit

1. Stage your changes with git
2. CodeRabbit can automatically prompt for review (based on settings)
3. Review feedback and apply suggestions
4. Commit when satisfied

### One-Click Fixes

When CodeRabbit suggests improvements:
1. Hover over the suggestion
2. Click "Fix with AI"
3. The fix is applied based on your AI agent setting

### Commands Available

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux):

- `CodeRabbit: Review Changes` - Review uncommitted changes
- `CodeRabbit: Review Selection` - Review selected code
- `CodeRabbit: Settings` - Open settings
- `CodeRabbit: Sign In/Out` - Manage authentication
- `CodeRabbit: Clear Review` - Clear current review results

## Features

### Line-by-Line Reviews
- Every line gets senior developer-level attention
- Catches bugs, security issues, and performance problems
- Suggests improvements and best practices

### Local Development Integration
- Reviews code before it's committed
- No need to create PRs for reviews
- Instant feedback during development

### AI-Powered Suggestions
- Contextual understanding of your codebase
- Learns from your .coderabbit.yaml configuration
- Applies project-specific rules and standards

## Troubleshooting

### Extension Not Found in Windsurf
- Windsurf can't access Microsoft Marketplace directly
- Use VSIX installation method instead
- Check Open VSX for availability

### Authentication Issues
1. Sign out: `CodeRabbit: Sign Out`
2. Clear credentials
3. Sign in again with GitHub

### Reviews Not Working
1. Verify repository is connected in CodeRabbit dashboard
2. Check .coderabbit.yaml exists in repository
3. Ensure you have uncommitted changes to review

### Performance Issues
- Adjust review scope in settings
- Review smaller chunks of code at once
- Check network connection to CodeRabbit servers

## Integration with GitHub Reviews

The extension complements GitHub PR reviews:
1. **Local reviews**: Use extension during development
2. **PR reviews**: CodeRabbit bot reviews on GitHub
3. **Consistent standards**: Same .coderabbit.yaml rules apply

## Tips for Effective Use

1. **Review frequently**: Don't wait until large changes accumulate
2. **Configure AI agent**: Choose the AI tool you're comfortable with
3. **Use auto-review**: Set to "prompt" for balanced workflow
4. **Apply fixes quickly**: Use one-click fix for simple improvements
5. **Learn from feedback**: CodeRabbit helps improve coding skills

## Version Information

- **Current Version**: 0.13.5
- **Publisher**: CodeRabbit Inc.
- **Compatibility**: VS Code 1.60.0+, Windsurf, Cursor
- **License**: Free tier available, premium for extensive use

## Resources

- [Official Documentation](https://docs.coderabbit.ai/guides/config-vscode)
- [GitHub Repository](https://github.com/coderabbitai)
- [Support](https://coderabbit.ai/support)
- [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=CodeRabbit.coderabbit-vscode)

## Notes for simplequiz Project

With our `.coderabbit.yaml` configuration, the extension will:
- Enforce shadcn/ui component usage
- Check for logger utility instead of console.log
- Verify TypeScript types and React hooks
- Apply all project-specific rules locally

This enables consistent code quality checks both locally and in GitHub PRs!