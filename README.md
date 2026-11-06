# idor-lab

[![Deploy on Back4app](https://img.shields.io/badge/Deploy%20on-Back4app-1568B8?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3eiIvPjwvc3ZnPg==)](https://www.back4app.com/signup?utm_source=github&utm_medium=repo&utm_campaign=idor-lab)

Two companies, three orders each, one backend. It asks the same five questions
three times — as the backend arrives, after requiring a login, and after giving
every row an owner the server enforces — and prints what one signed-in person
could reach that was not hers.

**Measured on Parse Server 7.4.0 with MongoDB 7, Docker 29.4.3, 29 October 2026.
Identical across two consecutive clean runs.**

> **Read the article:** [One Signed-In User Can Read Another User's Data: Why Requiring a Login Does Not Fix It](https://www.back4app.com/blog/one-user-can-read-another-users-data?utm_source=github&utm_medium=repo&utm_campaign=idor-lab)

## Run it

```
./run.sh
```

Needs Docker and Node 22. The backend is destroyed and rebuilt every run.

## What it found

| the backend | a stranger with no account | Ana, signed in |
| --- | --- | --- |
| as it arrives | 6 orders · opens · edits · deletes | 6 orders · opens · edits · deletes |
| after "require a login" | refused | **6 orders · opens · edits · deletes** |
| after a per-row owner | refused | 3 orders — only her own |

Three of the six orders belong to the other company. In the middle row, Ana
reaches all three: she opens one by its id, changes its price and deletes it.

**Requiring a login removed the attacker who did not have an account.** Everyone
who signs up has one.

### The ids were never the protection

```
Bruno's three order ids:  brxrKpFcOH  5zxbjkSdlE  Gcr51ESZbK
```

Random, not sequential, so nobody guesses one. The list endpoint returns all six
in a single request — which is the first thing the app does on page load. An
unguessable id changes the method, not the outcome.

## What the fix costs

```
Ana reads her own orders:        3 row(s)
Ana asks for the company total:  3 — only her own rows are counted
The real number of orders:       6 — an admin total now needs a server function
```

The count did not fail and did not warn. It returned a smaller number with the
same confidence as before, which is what makes it worth measuring: a dashboard
built on it shows a wrong total and looks healthy.

## The pieces

| file | what it does |
| --- | --- |
| `lab.mjs` | builds the two companies, and the five questions asked each stage |
| `run.mjs` | the three stages, in order, with the same questions each time |
| `client.mjs` | the two ways to call the backend: as a person, and as the owner |

Every question is asked of a decoy row written fresh for that question and owned
by the other company, so one probe can never spoil the next by deleting what it
was about to test.
