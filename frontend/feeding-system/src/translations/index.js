// src/translations/index.js
import { en } from './en';
import { si } from './si';
import { ta } from './ta';

export const translations = {
  en,
  si,
  ta
};

export const getTranslation = (language, path) => {
  const keys = path.split('.');
  let value = translations[language];
  
  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return path; // Return path if translation not found
    }
  }
  
  return value || path;
};
















