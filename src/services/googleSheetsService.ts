import { GOOGLE_SHEETS_API_URL } from '../constants/api';
import type { Round } from '../types';

interface SheetPayload {
    id: string;
    date: string;
    totalScore: number;
    scores: Record<string, any>;
}

export const saveRoundToGoogleSheets = async (round: Round): Promise<void> => {
    // Calculate total score
    const totalScore = Object.values(round.scores).reduce(
        (acc, score) => acc + score.approachShots + score.putts,
        0
    );

    const payload: SheetPayload = {
        id: round.id,
        date: new Date(round.date).toISOString(),
        totalScore,
        scores: round.scores
    };

    try {
        // We use Content-Type text/plain to avoid CORS preflight OPTIONS requests
        // which Google Apps Script Web Apps often don't handle well.
        const response = await fetch(GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Round saved to Google Sheets:', result);
    } catch (error) {
        console.error('Error saving round to Google Sheets:', error);
        // We re-throw the error so the UI can handle it if needed
        throw error;
    }
};
