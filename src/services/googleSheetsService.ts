import { GOOGLE_SHEETS_API_URL } from '../constants/api';
import type { Round, DrivingSession } from '../types';

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

    const payload: SheetPayload & { action: string } = {
        action: 'save',
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

        if (result.result === 'error') {
            throw new Error(`Google Sheets Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error saving round to Google Sheets:', error);
        throw error;
    }
};

export const deleteRoundFromGoogleSheets = async (roundId: string): Promise<void> => {
    const payload = {
        action: 'delete',
        id: roundId
    };

    try {
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
        console.log('Round deleted from Google Sheets:', result);

        if (result.result === 'error') {
            throw new Error(`Google Sheets Error: ${result.error}`);
        }
        if (result.result !== 'deleted') {
            // If we didn't get 'deleted', maybe 'not found' -> acceptable?
            // But if logic failed, we should know.
            if (result.result === 'not found') {
                console.warn('Round to delete was not found in sheet.');
                return;
            }
            throw new Error(`Unexpected result from server: ${JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error('Error deleting round from Google Sheets:', error);
        throw error;
    }
};

export const fetchRoundsFromGoogleSheets = async (): Promise<Round[]> => {
    try {
        // Add cache buster to prevent caching
        const url = `${GOOGLE_SHEETS_API_URL}?t=${Date.now()}`;

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw data from Google Sheets:', data);

        // Ensure data is an array
        const roundsData = Array.isArray(data) ? data : (data.rounds || []);
        console.log(`Parsed ${roundsData.length} rounds from Google Sheets`);

        return roundsData.map((item: any) => ({
            id: item.id,
            date: new Date(item.date),
            scores: item.scores || {},
            currentHoleIndex: 0, // Reset to start for viewed rounds
            startingHoleNumber: 1, // Default behavior
            isFinished: true // Assumed finished if stored in sheets
        }));
    } catch (error) {
        console.error('Error fetching rounds from Google Sheets:', error);
        throw error;
    }
};

export const saveDrivingSessionToGoogleSheets = async (session: DrivingSession): Promise<void> => {
    const payload = {
        action: 'save_driving_session',
        id: session.id,
        date: new Date(session.date).toISOString(),
        club: session.club,
        shots: session.shots,
        isFinished: session.isFinished
    };

    try {
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
        console.log('Driving session saved to Google Sheets:', result);

        if (result.result === 'error') {
            throw new Error(`Google Sheets Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error saving driving session to Google Sheets:', error);
        throw error;
    }
};

export const deleteDrivingSessionFromGoogleSheets = async (id: string): Promise<void> => {
    const payload = {
        action: 'delete_driving_session',
        id: id
    };

    try {
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
        console.log('Driving session deleted from Google Sheets:', result);

        if (result.result === 'error') {
            throw new Error(`Google Sheets Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error deleting driving session from Google Sheets:', error);
        throw error;
    }
};

export const fetchDrivingSessionsFromGoogleSheets = async (): Promise<import('../types').DrivingSession[]> => {
    try {
        // Add cache buster and action param to fetch driving sessions
        const url = `${GOOGLE_SHEETS_API_URL}?action=get_driving_sessions&t=${Date.now()}`;

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw driving sessions from Google Sheets:', data);

        // The script returns { sessions: [...] }
        const sessionsData: any[] = Array.isArray(data) ? data : (data.sessions || []);
        console.log(`Parsed ${sessionsData.length} driving sessions from Google Sheets`);

        return sessionsData.map((item: any) => {
            // Parse shots — stored as JSON string in the sheet
            let shots = [];
            if (typeof item.shots === 'string' && item.shots) {
                try { shots = JSON.parse(item.shots); } catch (_) { shots = []; }
            } else if (Array.isArray(item.shots)) {
                shots = item.shots;
            }

            return {
                id: String(item.id).replace(/^'/, ''), // strip leading apostrophe if present
                date: new Date(item.date),
                club: item.club as import('../types').DrivingSession['club'],
                shots,
                isFinished: true
            };
        });
    } catch (error) {
        console.error('Error fetching driving sessions from Google Sheets:', error);
        throw error;
    }
};
