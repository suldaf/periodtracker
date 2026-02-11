let customConfig = {}

try {
  // eslint-disable-next-line no-undef
  customConfig = require(`./src/resources/app.json`)
} catch (e) {
  console.log('Failed to load custom config')
}

export default ({ config }) => ({
  ...config,
  ...customConfig,
  extra: {
    ...(config.extra || {}),
    ...(customConfig.extra || {}),
    eas: {
      ...(config.extra?.eas || {}),
      ...(customConfig.extra?.eas || {}),
      projectId: "fe9d8f69-42d5-41bc-99ee-014b420f9363",
    },
  },
})
