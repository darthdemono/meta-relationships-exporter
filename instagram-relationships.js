// Instagram followers / following exporter
// Usage: open instagram.com while logged in, press F12 -> Console, paste this whole file, press Enter.
// Result: downloads instagram-relationships.json and keeps a copy in window.igRelationships.
(async () => {
    const PAGE_SIZE = 50;        // users per request
    const DELAY_MS = 1500;       // pause between requests (raise this if you hit rate limits)
const MAX_RETRIES = 5;       // retries per request on 429 / network errors
const FILE_NAME = 'instagram-relationships.json';

const HEADERS = {
    'x-ig-app-id': '936619743392459', // Instagram's public web app id
    'x-requested-with': 'XMLHttpRequest',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The logged-in account's numeric id lives in the ds_user_id cookie.
const userId = (document.cookie.match(/(?:^|;\s*)ds_user_id=(\d+)/) || [])[1];
if (!userId) {
    console.error('Not logged in (ds_user_id cookie missing). Log in to instagram.com and try again.');
    return;
}

async function getPage(kind, maxId) {
    const params = new URLSearchParams({ count: String(PAGE_SIZE) });
    if (maxId) params.set('max_id', maxId);
    const url = `/api/v1/friendships/${userId}/${kind}/?${params}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(url, { headers: HEADERS, credentials: 'include' });
            if (res.ok) return await res.json();
            if (res.status === 429 || res.status >= 500) {
                const wait = 30000 * attempt;
                console.warn(`[${kind}] HTTP ${res.status}, waiting ${wait / 1000}s (attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(wait);
                continue;
            }
            throw new Error(`HTTP ${res.status}`);
        } catch (err) {
            if (attempt === MAX_RETRIES) throw err;
            console.warn(`[${kind}] ${err.message}, retrying`);
            await sleep(5000 * attempt);
        }
    }
    throw new Error(`[${kind}] gave up after ${MAX_RETRIES} attempts`);
}

async function getAll(kind) {
    const seen = new Map(); // username -> entry, dedupes repeated rows across pages
    let maxId = null;
    let complete = true;

    try {
        do {
            const data = await getPage(kind, maxId);
            for (const u of data.users || []) {
                if (!seen.has(u.username)) {
                    seen.set(u.username, { name: u.full_name || '', username: u.username });
                }
            }
            maxId = data.next_max_id || null;
            console.log(`[${kind}] ${seen.size} collected`);
            if (maxId) await sleep(DELAY_MS + Math.random() * 500);
        } while (maxId);
    } catch (err) {
        complete = false;
        console.error(`[${kind}] stopped early: ${err.message}. Keeping the ${seen.size} collected so far.`);
    }

    return { list: [...seen.values()], complete };
}

const followers = await getAll('followers');
const following = await getAll('following');

const result = {
    relationships_followers: followers.list,
    relationships_following: following.list,
};
window.igRelationships = result;

const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = FILE_NAME;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(a.href), 1000);

console.log(
    `Done: ${followers.list.length} followers${followers.complete ? '' : ' (incomplete)'}, ` +
    `${following.list.length} following${following.complete ? '' : ' (incomplete)'}. Saved as ${FILE_NAME}.`
);
})();
