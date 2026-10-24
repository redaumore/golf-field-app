const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzo6G6qG4jc2fzpRZMAuueXjxlqM8VaOsGUr1nuG7G4zYMFZlp7vqSaU7uMHHAcTBCofg/exec';

export const GOOGLE_SHEETS_API_URL = import.meta.env.VITE_GOOGLE_SHEETS_API_URL ?? DEFAULT_API_URL;
