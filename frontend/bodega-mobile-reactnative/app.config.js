// Configuración dinámica sobre app.json. El tráfico HTTP sin cifrar (necesario para hablar con el
// backend por IP en la red local) solo se permite al compilar con KAREN_ALLOW_CLEARTEXT=1; un
// build normal queda con las restricciones por defecto de Android (cleartext bloqueado) y de iOS (ATS).
module.exports = ({ config }) => {
  if (process.env.KAREN_ALLOW_CLEARTEXT !== '1') return config;

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Permite HTTP solo hacia direcciones de red local (IP privada, .local); internet sigue exigiendo HTTPS.
        NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    ],
  };
};
