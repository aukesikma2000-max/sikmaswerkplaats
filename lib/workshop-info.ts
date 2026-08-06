export const CURRENT_USER = 'Marieke de Vries';
export const LOCATION = 'Bolsward';
export const WORKSHOP_NAME = "Sikma's Werkplaats";
export const WORKSHOP_ADDRESS = 'Industrieweg 12, 8701 PB Bolsward';
export const WORKSHOP_PHONE = '0515 123 456';
export const WORKSHOP_EMAIL = 'info@sikmaswerkplaats.nl';
export const WORKSHOP_VAT = 'NL123456789B01';

export function getCurrentUser() {
  return CURRENT_USER;
}

export function getCurrentLocation() {
  return LOCATION;
}

export function getCurrentDate() {
  return new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
