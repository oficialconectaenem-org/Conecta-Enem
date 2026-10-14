import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.conectarenem.app',
  appName: 'Conecta Enem',
  webDir: '.output/public',
  server: {
    // Para testar em desenvolvimento com live-reload no celular, descomente e coloque seu IP local:
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
      showSpinner: false,
      androidSplashResourceName: 'splash'
    }
  }
};

export default config;
