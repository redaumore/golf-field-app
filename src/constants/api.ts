const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxaqXqSFcz5jCXTUEpGpIruzDEJDHsAEd_3Rg-ovgLKozEzrZeBfn1ptT35i6pJDAinjA/exec';

export const GOOGLE_SHEETS_API_URL = import.meta.env.VITE_GOOGLE_SHEETS_API_URL ?? DEFAULT_API_URL;
