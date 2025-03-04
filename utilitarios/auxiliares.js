function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatarData(data) {
    if (!data) return null;
    return new Date(data).toISOString().split('T')[0].split('-').reverse().join('/');
}

module.exports = { esperar, formatarData };
