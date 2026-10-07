// Facebook friends exporter
// Usage: open https://www.facebook.com/me/friends while logged in, press F12 -> Console,
// paste this whole file, press Enter, and leave the tab in the foreground while it scrolls.
// Result: downloads facebook-friends.json and keeps a copy in window.fbFriends.
(async () => {
    const SCROLL_DELAY_MS = 1500; // pause after each scroll so the next batch can load
    const STABLE_ROUNDS = 6;      // stop after this many scrolls in a row with no new friends
    const FILE_NAME = 'facebook-friends.json';

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    if (!/\/friends(_all)?\/?$/.test(location.pathname) && !/[?&]sk=friends/.test(location.search)) {
        console.error('Open https://www.facebook.com/me/friends first, then run this script again.');
        return;
    }

    const main = document.querySelector('[role="main"]') || document.body;
    const owner = location.pathname.split('/').filter(Boolean)[0]; // your own profile slug
    const RESERVED = new Set([
        'friends', 'groups', 'watch', 'marketplace', 'gaming', 'events', 'pages', 'photo', 'photos',
        'reel', 'stories', 'messages', 'notifications', 'settings', 'help', 'bookmarks', 'hashtag',
    ]);

    // Turn a link into a profile key: the vanity username, or the numeric id for profile.php links.
    function profileKey(href) {
        let u;
        try { u = new URL(href, location.origin); } catch (e) { return null; }
        if (!/(^|\.)facebook\.com$/.test(u.hostname)) return null;
        if (u.pathname === '/profile.php') {
            if (u.searchParams.has('sk')) return null; // a tab link, not a person
            return u.searchParams.get('id');
        }
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length !== 1) return null; // tab links like /you/friends_mutual
        if (parts[0] === owner || RESERVED.has(parts[0].toLowerCase())) return null;
        return parts[0];
    }

    // A friend card has two links to the same profile: the picture and the name.
    function scan(root, requirePicture) {
        const pictures = new Set();
        const names = new Map(); // key -> { name, el }
        for (const a of root.querySelectorAll('a[href]')) {
            const key = profileKey(a.getAttribute('href'));
            if (!key) continue;
            if (a.querySelector('img, image')) { pictures.add(key); continue; }
            const name = a.textContent.replace(/\s+/g, ' ').trim();
            if (name && !names.has(key)) names.set(key, { name, el: a });
        }
        if (requirePicture) for (const key of [...names.keys()]) if (!pictures.has(key)) names.delete(key);
        return names;
    }

    // Scope to the friends grid (the element holding the first batch of cards), so that other
    // profile sections that lazy-load further down the page are not mistaken for friends.
    let strict = true;
    let first = scan(main, true);
    if (first.size === 0) {
        strict = false;
        first = scan(main, false);
        console.warn('Friend cards did not match the expected picture + name layout; using name links only. Check the output for stray entries.');
    }
    if (first.size === 0) {
        console.error('No friends found on this page. Make sure the friends list is visible, then run again.');
        return;
    }
    let root = main;
    if (first.size >= 2) {
        let lca = [...first.values()][0].el;
        for (const { el } of first.values()) while (lca && !lca.contains(el)) lca = lca.parentElement;
        if (lca && main.contains(lca)) root = lca;
    }

    const friends = new Map(); // key -> { name, username }
    const collect = () => {
        for (const [key, { name }] of scan(root, strict)) {
            if (!friends.has(key)) friends.set(key, { name, username: key });
        }
    };

    collect();
    let stable = 0;
    while (stable < STABLE_ROUNDS) {
        const before = friends.size;
        window.scrollTo(0, document.documentElement.scrollHeight);
        await sleep(SCROLL_DELAY_MS);
        collect();
        if (friends.size > before) {
            stable = 0;
            console.log(`${friends.size} friends collected`);
        } else {
            stable++;
        }
    }

    const result = { friends_v2: [...friends.values()] };
    window.fbFriends = result;

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);

    console.log(`Done: ${friends.size} friends saved as ${FILE_NAME}. Compare this with the friend count on your profile.`);
})();
