// const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// /**
//  * Metro configuration
//  * https://reactnative.dev/docs/metro
//  *
//  * @type {import('@react-native/metro-config').MetroConfig}
//  */
// const config = {};

// // module.exports = mergeConfig(getDefaultConfig(__dirname), config);
// module.exports = (() => {
//     const config = getDefaultConfig(__dirname);
//     // const { assetExts } = config.resolver;
//     config.resolver.assetExts.push('bin');

//     // config.resolver.assetExts = [...assetExts, 'bin']; // 👈 Add this line

//     return config;
// })();
const { getDefaultConfig } = require('@react-native/metro-config');

module.exports = (async () => {
    const {
        resolver: { assetExts },
    } = await getDefaultConfig(__dirname);

    return {
        transformer: {
            // this is important to avoid metro handling large assets
            getTransformOptions: async () => ({
                transform: {
                    experimentalImportSupport: false,
                    inlineRequires: true,
                },
            }),
        },
        resolver: {
            assetExts: [...assetExts, 'bin'], // allow .bin files to be treated as static assets
        },
    };
})();