export const STORAGE_BUCKET = 'product-images';

// Global Business Logic Constants
export const ORDER_STATUSES = [
    { value: 'pending', label: 'PENDING', color: 'text-brand-orange border-brand-orange/30 bg-brand-orange/10' },
    { value: 'processing', label: 'PROCESSING', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { value: 'shipped', label: 'SHIPPED', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { value: 'delivered', label: 'DELIVERED', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
    { value: 'cancelled', label: 'CANCELLED', color: 'text-red-400 border-red-500/30 bg-red-500/10' }
];

export const APP_THEME = {
    primary: '#FF7B00', // Brand Orange
    secondary: '#000000',
    accent: '#FFFFFF'
};
