# Icumbi App - Quick Start Guide

## 🚀 Getting Started

This guide will help you set up and use the complete build and deployment pipeline for the Icumbi mobile app.

## Prerequisites

### Required Tools
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git** for version control
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g @expo/eas-cli`

### Required Accounts
- **Expo Account**: Sign up at https://expo.dev
- **Apple Developer Account** (for iOS builds)
- **Google Play Console Account** (for Android builds)

## Initial Setup

### 1. Install Dependencies
```bash
# Install global tools
npm install -g @expo/cli @expo/eas-cli

# Install project dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env with your actual values
# See env.example for all required variables
```

### 3. Login to Expo
```bash
# Login to your Expo account
eas login
```

### 4. Configure EAS
```bash
# Configure build settings
eas build:configure
```

### 5. Set Up Credentials
```bash
# For iOS builds
eas credentials:configure --platform ios

# For Android builds
eas credentials:configure --platform android
```

## Quick Build Commands

### Development Builds
```bash
# Android development build
npm run build:android-preview

# iOS development build
npm run build:ios-preview

# Both platforms
npm run build:all-preview
```

### Production Builds
```bash
# Android production build (AAB)
npm run build:android-production

# iOS production build
npm run build:ios-production

# Both platforms
npm run build:all-production
```

### Using Build Script
```bash
# Make script executable
chmod +x scripts/build.sh

# Build for specific platform and profile
./scripts/build.sh build android production
./scripts/build.sh build ios preview
./scripts/build.sh build all production

# List recent builds
./scripts/build.sh list

# Clean build cache
./scripts/build.sh clean
```

## App Store Submission

### iOS App Store
```bash
# Build production version
npm run build:ios-production

# Submit to App Store
npm run submit:ios
```

### Google Play Store
```bash
# Build production version
npm run build:android-production

# Submit to Play Store
npm run submit:android
```

## Environment Variables Setup

### Required Environment Variables
```bash
# Set up EAS secrets for production
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-supabase-key"

# Platform-specific secrets
eas secret:create --scope project --platform ios --name APPLE_TEAM_ID --value "your-team-id"
eas secret:create --scope project --platform android --name GOOGLE_SERVICE_ACCOUNT_KEY --value "your-service-account-key"
```

### Environment Configuration
The app uses different environments:
- **Development**: `EXPO_PUBLIC_ENV=development`
- **Preview**: `EXPO_PUBLIC_ENV=preview`
- **Production**: `EXPO_PUBLIC_ENV=production`

## Testing Your Builds

### 1. Internal Testing
```bash
# Build for internal testing
npm run build:android-preview
npm run build:ios-preview

# Share build links with testers
eas build:list
```

### 2. TestFlight (iOS)
```bash
# Submit to TestFlight
eas submit --platform ios --profile preview
```

### 3. Internal Testing (Android)
```bash
# Upload to Google Play Console
eas submit --platform android --profile preview
```

## Common Commands

### Build Management
```bash
# List recent builds
npm run build:list

# View specific build
npm run build:view

# Cancel running build
npm run build:cancel
```

### Project Management
```bash
# View project info
npm run project:info

# Configure project
npm run project:init
```

### Credentials Management
```bash
# List credentials
npm run credentials:list

# Configure credentials
npm run credentials:configure
```

### Update Management
```bash
# Configure updates
npm run update:configure

# View updates
npm run update:view

# List updates
npm run update:list
```

## Troubleshooting

### Common Issues

#### Build Fails
```bash
# Check build logs
eas build:view

# Clean and rebuild
npm run clean:cache
npm run build:android-production
```

#### Credential Issues
```bash
# Reconfigure credentials
eas credentials:configure --platform ios
eas credentials:configure --platform android
```

#### Version Conflicts
```bash
# Check current version
cat app.json | grep version

# Update version manually in app.json
```

### Getting Help
```bash
# Validate configuration
npm run validate:config

# Check EAS status
eas whoami

# View project configuration
eas project:info
```

## CI/CD Pipeline

### GitHub Actions
The project includes a comprehensive CI/CD pipeline that:
- Runs on push to main/staging branches
- Executes linting and testing
- Performs security scans
- Builds for both platforms
- Deploys to app stores
- Sends notifications

### Manual Deployment
```bash
# Trigger manual deployment via GitHub Actions
# Go to Actions tab in GitHub repository
# Click "Run workflow" and select parameters
```

## App Store Metadata

### Required Assets
- **App Icons**: 1024x1024 PNG for iOS, adaptive icons for Android
- **Screenshots**: Multiple device sizes for both platforms
- **App Descriptions**: Optimized for each platform
- **Privacy Policy**: Active URL required

### Metadata Files
- See `metadata/app-store-metadata.md` for complete specifications
- Update descriptions and keywords as needed
- Prepare release notes for each version

## Security Best Practices

### Code Signing
- **iOS**: Use Apple Developer certificates
- **Android**: Use Google Play App Signing
- **Credentials**: Store securely in EAS

### Environment Variables
- **Sensitive Data**: Use EAS secrets
- **API Keys**: Never commit to repository
- **Configuration**: Use environment-specific configs

## Performance Optimization

### Build Optimization
- **Bundle Size**: Minimize JavaScript bundle
- **Assets**: Optimize images and media
- **Dependencies**: Remove unused packages

### Runtime Optimization
- **Memory Usage**: Monitor memory consumption
- **Network Requests**: Optimize API calls
- **UI Performance**: Optimize rendering

## Monitoring and Analytics

### Build Monitoring
```bash
# Check build status
npm run build:list

# View app analytics
# App Store Connect Analytics
# Google Play Console Analytics
```

### Performance Monitoring
- **Expo Analytics**: Built-in analytics
- **Custom Analytics**: Implement as needed
- **Crash Reporting**: Configure crash reporting service

## Support and Resources

### Documentation
- **Expo Documentation**: https://docs.expo.dev
- **EAS Documentation**: https://docs.expo.dev/eas/
- **React Native**: https://reactnative.dev

### Community
- **Expo Discord**: https://discord.gg/expo
- **React Native Community**: https://reactnative.dev/community

### Project Documentation
- **Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Release Management**: `docs/RELEASE_MANAGEMENT.md`
- **App Store Metadata**: `metadata/app-store-metadata.md`

## Next Steps

1. **Complete Setup**: Follow all setup steps above
2. **Test Builds**: Create test builds for both platforms
3. **App Store Setup**: Configure app store listings
4. **Deploy**: Submit your first production build
5. **Monitor**: Set up monitoring and analytics
6. **Iterate**: Use the pipeline for future releases

## Need Help?

- **Technical Issues**: Check the troubleshooting section
- **Build Issues**: Review build logs and documentation
- **App Store Issues**: Contact respective platforms
- **Project Support**: Contact the development team

---

**Happy Building! 🎉**

Your Icumbi app is now ready for professional deployment and distribution. 