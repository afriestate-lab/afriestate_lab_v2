export default {
  expo: {
    name: "Afri Estate",
    slug: "afri-estate-web",
    version: "2.0.0",
    sdkVersion: "54.0.0",
    assetBundlePatterns: [
      "**/*"
    ],
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router"
    ],
    scheme: "afri-estate",
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      }
    }
  }
};
