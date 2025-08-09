export default {
  expo: {
    name: "Icumbi",
    slug: "icumbi-mobile",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      bundleIdentifier: "com.icumbi.app",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "Icumbi needs camera access to take property photos.",
        NSPhotoLibraryUsageDescription: "Icumbi needs photo library access to choose property images.",
      }
    },
    android: {
      package: "com.icumbi.app",
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      "expo-secure-store"
    ],
    scheme: "icumbi",
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "704c3887-c2d3-4c2c-8cfb-6a23ac051cac"
      }
    }
  }
};
