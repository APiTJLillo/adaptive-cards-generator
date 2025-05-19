export const saveCard = async (card, name = "Adaptive Card") => {
    try {
        const response = await fetch('/api/now/table/x_acdg_adaptive_card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, payload: JSON.stringify(card) })
        });
        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error saving card', error);
        throw error;
    }
};

export const loadCard = async (sysId) => {
    try {
        const response = await fetch(`/api/now/table/x_acdg_adaptive_card/${sysId}`);
        const data = await response.json();
        return JSON.parse(data.result.payload);
    } catch (error) {
        console.error('Error loading card', error);
        throw error;
    }
};
