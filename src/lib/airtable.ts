/**
 * Airtable Sync Utility
 * 
 * To use this, you must have the following environment variables in your .env.local:
 * AIRTABLE_API_KEY (Your Personal Access Token from Airtable starting with "pat")
 * AIRTABLE_BASE_ID (The ID of your base, e.g. "appXXXXXXXXXXXXXX")
 * AIRTABLE_TABLE_NAME (The name of the table, e.g. "Registrations")
 */

export interface AirtableRegistration {
    Name: string;
    Email: string;
    Phone?: string | null;
    EventTitle: string;
    Status: string;
    DateRegistered: string;
}

export async function syncRegistrationToAirtable(data: AirtableRegistration) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Registrations';

    if (!apiKey || !baseId) {
        console.warn('⚠️ Airtable API Key or Base ID not set. Skipping Airtable sync.');
        return { success: true, skipped: true };
    }

    try {
        const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: [
                    {
                        fields: {
                            "Name": data.Name,
                            "Email": data.Email,
                            "Phone": data.Phone || "",
                            "Event Title": data.EventTitle,
                            "Status": data.Status,
                            "Date Registered": data.DateRegistered,
                        }
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Airtable API error:', errorData);
            return { success: false, error: errorData };
        }

        const result = await response.json();
        return { success: true, data: result };

    } catch (err) {
        console.error('❌ Failed to sync to Airtable:', err);
        return { success: false, error: err };
    }
}
