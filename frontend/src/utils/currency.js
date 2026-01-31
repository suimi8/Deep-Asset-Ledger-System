const CURRENCY_SYMBOLS = {
    'USD': '$',
    'CNY': '¥',
    'HKD': 'HK$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥'
};

export const getCurrencySymbol = () => {
    return CURRENCY_SYMBOLS[localStorage.getItem('currency') || 'USD'] || '$';
};

export const formatCurrency = (amount, decimals = 2) => {
    const symbol = getCurrencySymbol();
    const value = parseFloat(amount || 0).toFixed(decimals);
    return `${symbol}${value}`;
};

// Listen for currency changes
export const useCurrency = (callback) => {
    const handleCurrencyChange = (event) => {
        if (callback) callback(event.detail);
    };

    window.addEventListener('currencyChange', handleCurrencyChange);
    return () => window.removeEventListener('currencyChange', handleCurrencyChange);
};
