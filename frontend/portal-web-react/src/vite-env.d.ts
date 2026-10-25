/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STORE_TRADE_NAME?: string;
  readonly VITE_STORE_LEGAL_NAME?: string;
  readonly VITE_STORE_RUC?: string;
  readonly VITE_STORE_ADDRESS?: string;
  readonly VITE_STORE_CITY?: string;
  readonly VITE_STORE_LAT?: string;
  readonly VITE_STORE_LNG?: string;
}
