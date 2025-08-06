#!/bin/bash

# Icumbi App Build Automation Script
# This script automates the build and deployment process for the Icumbi mobile app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Icumbi"
PROJECT_ID="704c3887-c2d3-4c2c-8cfb-6a23ac051cac"
ANDROID_PACKAGE="com.icumbi.app"
IOS_BUNDLE="com.icumbi.app"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if EAS CLI is installed
    if ! command -v eas &> /dev/null; then
        error "EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli"
        exit 1
    fi
    
    # Check if logged in to Expo
    if ! eas whoami &> /dev/null; then
        error "Not logged in to Expo. Please run: eas login"
        exit 1
    fi
    
    # Check if in correct directory
    if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
        error "Not in the correct project directory"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Validate configuration
validate_config() {
    log "Validating configuration..."
    
    # Check app.json
    if ! jq -e '.expo.name' app.json > /dev/null 2>&1; then
        error "Invalid app.json configuration"
        exit 1
    fi
    
    # Check eas.json
    if ! jq -e '.build' eas.json > /dev/null 2>&1; then
        error "Invalid eas.json configuration"
        exit 1
    fi
    
    success "Configuration validation passed"
}

# Build function
build_app() {
    local platform=$1
    local profile=$2
    
    log "Building $APP_NAME for $platform with $profile profile..."
    
    case $platform in
        "android")
            case $profile in
                "preview")
                    npm run build:android-preview
                    ;;
                "production")
                    npm run build:android-production
                    ;;
                *)
                    error "Invalid profile: $profile"
                    exit 1
                    ;;
            esac
            ;;
        "ios")
            case $profile in
                "preview")
                    npm run build:ios-preview
                    ;;
                "production")
                    npm run build:ios-production
                    ;;
                *)
                    error "Invalid profile: $profile"
                    exit 1
                    ;;
            esac
            ;;
        "all")
            case $profile in
                "preview")
                    npm run build:all-preview
                    ;;
                "production")
                    npm run build:all-production
                    ;;
                *)
                    error "Invalid profile: $profile"
                    exit 1
                    ;;
            esac
            ;;
        *)
            error "Invalid platform: $platform"
            exit 1
            ;;
    esac
    
    success "Build completed for $platform with $profile profile"
}

# Submit function
submit_app() {
    local platform=$1
    
    log "Submitting $APP_NAME to $platform app store..."
    
    case $platform in
        "android")
            npm run submit:android
            ;;
        "ios")
            npm run submit:ios
            ;;
        *)
            error "Invalid platform: $platform"
            exit 1
            ;;
    esac
    
    success "Submission completed for $platform"
}

# List builds
list_builds() {
    log "Listing recent builds..."
    npm run build:list
}

# Clean function
clean_builds() {
    log "Cleaning build cache..."
    npm run clean:cache
    success "Build cache cleaned"
}

# Main function
main() {
    local action=$1
    local platform=$2
    local profile=$3
    
    log "Starting Icumbi build automation..."
    
    check_prerequisites
    validate_config
    
    case $action in
        "build")
            if [ -z "$platform" ] || [ -z "$profile" ]; then
                error "Usage: $0 build <platform> <profile>"
                error "Platforms: android, ios, all"
                error "Profiles: preview, production"
                exit 1
            fi
            build_app $platform $profile
            ;;
        "submit")
            if [ -z "$platform" ]; then
                error "Usage: $0 submit <platform>"
                error "Platforms: android, ios"
                exit 1
            fi
            submit_app $platform
            ;;
        "list")
            list_builds
            ;;
        "clean")
            clean_builds
            ;;
        "validate")
            validate_config
            ;;
        *)
            echo "Usage: $0 {build|submit|list|clean|validate}"
            echo ""
            echo "Commands:"
            echo "  build <platform> <profile>  - Build the app"
            echo "  submit <platform>           - Submit to app store"
            echo "  list                        - List recent builds"
            echo "  clean                       - Clean build cache"
            echo "  validate                    - Validate configuration"
            echo ""
            echo "Platforms: android, ios, all"
            echo "Profiles: preview, production"
            exit 1
            ;;
    esac
    
    success "Build automation completed successfully"
}

# Run main function with all arguments
main "$@" 