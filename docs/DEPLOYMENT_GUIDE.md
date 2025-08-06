# Icumbi App Deployment Guide

## Overview
This guide provides step-by-step instructions for building, testing, and deploying the Icumbi mobile app to both iOS App Store and Google Play Store.

## Prerequisites

### Required Tools
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **EAS CLI**: `npm install -g @expo/eas-cli`
- **Expo Account**: Sign up at https://expo.dev
- **Apple Developer Account** (for iOS)
- **Google Play Console Account** (for Android)

### Required Accounts
- **Expo**: https://expo.dev
- **Apple Developer**: https://developer.apple.com
- **Google Play Console**: https://play.google.com/console
- **App Store Connect**: https://appstoreconnect.apple.com

## Initial Setup

### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure Project
```bash
eas build:configure
```

### 4. Set Up Credentials
```bash
# For iOS
eas credentials:configure --platform ios

# For Android
eas credentials:configure --platform android
```

## Build Process

### Development Builds
For testing and development:
```bash
# Android development build
npm run build:android-preview

# iOS development build
npm run build:ios-preview

# Both platforms
npm run build:all-preview
```

### Production Builds
For app store submission:
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

## Build Profiles

### Development Profile
- **Purpose**: Development and testing
- **Distribution**: Internal
- **Build Type**: APK (Android), Simulator (iOS)
- **Features**: Development client, debugging enabled

### Preview Profile
- **Purpose**: Internal testing and QA
- **Distribution**: Internal
- **Build Type**: APK (Android), Release (iOS)
- **Features**: Production-like environment

### Production Profile
- **Purpose**: App store submission
- **Distribution**: Store
- **Build Type**: AAB (Android), Release (iOS)
- **Features**: Optimized, auto-increment version

## Environment Variables

### Setting Up Secrets
```bash
# Set environment variables for production
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-supabase-key"

# Set secrets for specific platforms
eas secret:create --scope project --platform ios --name APPLE_TEAM_ID --value "your-team-id"
eas secret:create --scope project --platform android --name GOOGLE_SERVICE_ACCOUNT_KEY --value "your-service-account-key"
```

### Environment Configuration
The app uses different environment variables for different build profiles:
- **Development**: `EXPO_PUBLIC_ENV=development`
- **Preview**: `EXPO_PUBLIC_ENV=preview`
- **Production**: `EXPO_PUBLIC_ENV=production`

## Testing Process

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

## App Store Submission

### iOS App Store
1. **Build Production Version**
   ```bash
   npm run build:ios-production
   ```

2. **Submit to App Store**
   ```bash
   npm run submit:ios
   ```

3. **App Store Connect Setup**
   - Create app in App Store Connect
   - Configure app information
   - Upload screenshots and metadata
   - Set up pricing and availability
   - Submit for review

### Google Play Store
1. **Build Production Version**
   ```bash
   npm run build:android-production
   ```

2. **Submit to Play Store**
   ```bash
   npm run submit:android
   ```

3. **Play Console Setup**
   - Create app in Google Play Console
   - Configure store listing
   - Upload screenshots and metadata
   - Set up pricing and distribution
   - Submit for review

## Release Management

### Version Management
- **Auto-increment**: Enabled for production builds
- **Manual versioning**: Update `app.json` version field
- **Build numbers**: Managed by EAS automatically

### Release Checklist
- [ ] All features tested
- [ ] Performance optimized
- [ ] Screenshots updated
- [ ] App store metadata ready
- [ ] Privacy policy updated
- [ ] Support information current
- [ ] Legal requirements met

### Rollback Process
1. **Identify Issue**: Monitor app store reviews and crash reports
2. **Fix Issue**: Develop and test fix
3. **Build New Version**: Create new build with fix
4. **Submit Update**: Submit to app stores
5. **Monitor**: Track fix effectiveness

## Monitoring and Analytics

### Build Monitoring
```bash
# Check build status
npm run build:list

# View specific build
npm run build:view
```

### App Store Analytics
- **iOS**: App Store Connect Analytics
- **Android**: Google Play Console Analytics
- **Crash Reporting**: Configure in app.json

### Performance Monitoring
- **Expo Analytics**: Built-in analytics
- **Custom Analytics**: Implement as needed
- **Crash Reporting**: Configure crash reporting service

## Troubleshooting

### Common Build Issues

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

# Update version manually
# Edit app.json version field
```

### Common Submission Issues

#### App Store Rejection
1. **Review Guidelines**: Check Apple's App Store Review Guidelines
2. **Fix Issues**: Address specific rejection reasons
3. **Resubmit**: Build new version and resubmit

#### Play Store Rejection
1. **Policy Violation**: Check Google Play Developer Program Policies
2. **Fix Issues**: Address specific rejection reasons
3. **Resubmit**: Build new version and resubmit

## Security Best Practices

### Code Signing
- **iOS**: Use Apple Developer certificates
- **Android**: Use Google Play App Signing
- **Credentials**: Store securely in EAS

### Environment Variables
- **Sensitive Data**: Use EAS secrets
- **API Keys**: Never commit to repository
- **Configuration**: Use environment-specific configs

### Data Protection
- **Encryption**: Implement data encryption
- **Privacy**: Follow privacy guidelines
- **GDPR**: Comply with data protection regulations

## Performance Optimization

### Build Optimization
- **Bundle Size**: Minimize JavaScript bundle
- **Assets**: Optimize images and media
- **Dependencies**: Remove unused packages

### Runtime Optimization
- **Memory Usage**: Monitor memory consumption
- **Network Requests**: Optimize API calls
- **UI Performance**: Optimize rendering

## Continuous Integration

### GitHub Actions (Optional)
```yaml
# .github/workflows/build.yml
name: Build and Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build:all-production
```

### Automated Deployment
- **Trigger**: On main branch push
- **Build**: Automatic production build
- **Submit**: Manual submission to app stores

## Support and Resources

### Documentation
- **Expo Documentation**: https://docs.expo.dev
- **EAS Documentation**: https://docs.expo.dev/eas/
- **React Native**: https://reactnative.dev

### Community
- **Expo Discord**: https://discord.gg/expo
- **React Native Community**: https://reactnative.dev/community

### Support
- **Technical Issues**: Check Expo documentation
- **Build Issues**: Review build logs
- **App Store Issues**: Contact respective platforms

## Conclusion

This deployment guide provides a comprehensive approach to building and deploying the Icumbi app. Follow these steps carefully to ensure successful app store submissions and maintain high-quality releases.

For additional support or questions, refer to the troubleshooting section or contact the development team. 