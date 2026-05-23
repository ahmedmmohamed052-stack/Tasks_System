# Workspace Session Planner — JS Logic Layer

## Project Structure

```
src/
├── firebase/
│   ├── config.js       Firebase initialization
│   └── auth.js         Phone auth + Firestore access control
├── logic/
│   ├── fields.js       Field dictionaries + timer groups
│   └── sessionLogic.js Session planning + timer
└── index.js            Public API exports
```

---

## Firestore Structure

```
allowedUsers/
  +201234567890  →  { active: true,  name: "Ahmed",  addedAt: Timestamp }
  +201111111111  →  { active: false, name: "Sara",   addedAt: Timestamp }
```

- Only documents where `active === true` can log in.
- To block a user → set `active: false` (no deletion needed).
- To permanently remove → delete the document.

---

## Auth Flow

```js
import { sendOTP, verifyOTP, onAuthChange, logout } from "./src/index.js";

// 1. Send OTP
await sendOTP("+201234567890", "send-otp-btn");

// 2. Verify OTP (also checks Firestore)
const result = await verifyOTP("123456");

if (result.success) {
  console.log("Welcome", result.user.phoneNumber);
} else {
  console.error(result.error);
}

// 3. Watch auth state (runs on every page load)
onAuthChange(({ loggedIn, user }) => {
  if (loggedIn) {
    // show app
  } else {
    // redirect to login
  }
});

// 4. Logout
await logout();
```

---

## Session Planning Flow

```js
import {
  createTask,
  buildSessionPlan,
  calcSessionSummary,
  startTimer,
} from "./src/index.js";

// 1. Create tasks
const tasks = [
  createTask("Fix login bug",    "hard",   "Technology"),
  createTask("Update dashboard", "medium", "Technology"),
  createTask("Reply to emails",  "easy",   "Technology"),
];

// 2. Build plan  (tasks auto-sorted: hard → medium → easy)
const plan = buildSessionPlan("work", "Technology", "Web Development", tasks);

console.log(plan.totalMinutes);   // total session duration
console.log(plan.blocks);         // work + break blocks in order

// 3. Run a timer for a block
const timer = startTimer(plan.blocks[0].duration, {
  onTick:     ({ minutes, seconds }) => {
    console.log(`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`);
  },
  onComplete: () => console.log("Block done!"),
});

timer.pause();   // pause
timer.resume();  // resume
timer.stop();    // stop entirely

// 4. Mark task as complete
tasks[0].completed  = true;
tasks[0].actualTime = 85;   // minutes they actually spent

// 5. Calculate focus score at end of session
const summary = calcSessionSummary(tasks, 120);
console.log(summary.focusScore);      // 0–100
console.log(summary.completedTasks);
```

---

## Available Difficulty Levels

| Level    | Group A (Tech/Med/Eng) | Group B (Design/Law/Arts) | Group C (Sci/Edu/School) |
|----------|------------------------|---------------------------|--------------------------|
| `easy`   | 40 min                 | 30 min                    | 35 min                   |
| `medium` | 60 min                 | 45 min                    | 50 min                   |
| `hard`   | 90 min                 | 75 min                    | 85 min                   |
