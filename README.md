# Social List Exporters

Two scripts you paste into your own browser console to save who you follow, who follows you, and who your Facebook friends are, as JSON with each person's username and display name side by side.

That pairing is the whole point. A username alone tells you nothing about who someone is, and a display name alone is ambiguous. Together they let you link an account to a person you already know, which is what the rest of my tooling needs.

## What you get

| Script | Run it on | Output |
| --- | --- | --- |
| `instagram-relationships.js` | instagram.com, logged in | `instagram-relationships.json` with `relationships_followers` and `relationships_following`, each a list of `{name, username}` |
| `facebook-friends.js` | facebook.com/me/friends, logged in | `facebook-friends.json` with `friends_v2`, a list of `{name, username}` |

On Facebook the `username` is the vanity name from the profile link, or the numeric id when the profile has no vanity name.

## How to run one

1. Log in to the site in a normal browser tab and open the page named in the table.
2. Open the developer console (F12, then Console).
3. Paste the whole script and press Enter.
4. Wait. The Instagram script pages through the lists slowly on purpose. The Facebook script scrolls the friends list, so leave that tab in the foreground until it says it is done.
5. The browser downloads the JSON file. The script also keeps a copy in `window.igRelationships` or `window.fbFriends`.

If you paste a script into a console and a page tells you not to, read the script first. They are short. Each one has its settings at the top (delay, page size, retries) and a comment block saying what it does.

## Read this before you use them

- **They are not official.** The Instagram script calls the same private web endpoints the site itself uses, with the id from your own session cookie. The Facebook script reads the page it is looking at. Either site can change that tomorrow and the script will break or return less than it should. Check the count it prints against your profile.
- **They may be against the site's terms.** Automated reading of your own account is the kind of thing platforms rate-limit or dislike. The scripts go slowly and back off on errors, which lowers the risk and does not remove it. Use them on your own account, at your own risk.
- **The output names other people.** Followers, following and friends are other people's names and handles. The `.gitignore` here keeps the JSON out of the repository. Keep it out of anywhere public.
- **They send your data nowhere.** The only requests go to the site you are already on; the file is built in the browser and downloaded.

## What I do with the files

I match each pair against a private map of the people I know. If the username is already known, the display name is added. If the display name is already known, the username is added. Anyone who matches nobody is left alone, and nobody is created. In Dossify that is `dossify people enrich`.

## Licence

Apache License 2.0. See `LICENSE` and `NOTICE`.
