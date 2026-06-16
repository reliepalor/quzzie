# User Account Roadmap

This document tracks the planned rollout for adding user accounts to Quizzie.

## Goal

Add a user account experience that helps users see their past activity, understand their progress, and return to unfinished or saved quiz work.

## Recommended Order

Start with the smallest UI that proves the account concept, then add stored history, then add analytics and convenience features.

1. Account shell and navigation
2. Quiz history and activity list
3. Quiz result review and saved quizzes
4. Progress dashboard and weak-topic insights
5. Settings and profile management

## Phase 1: Account Foundation

### What to build first

- User auth flow placeholder or real auth provider integration
- Account layout with sidebar or top navigation
- Basic profile card
- Empty states for history and saved content

### Auth UI Direction

- Use a minimalist slide-over panel instead of a separate login page
- Open it from the top-right account button or a small profile chip
- Keep the panel narrow on desktop and full-height on mobile
- Let the panel switch between Sign In and Register without leaving the page
- Close it with the backdrop, Escape key, or a visible close button

### Auth Drawer Content

- Brand title or app name at the top
- Sign In and Register tabs
- Email field
- Password field
- Confirm password field only for register mode
- Primary action button
- Small text for password rules or magic-link option if enabled
- Optional switch to stay signed in
- Small footer link for terms or privacy if needed

### Minimal Behavior

- If the user is signed out, show the panel when they click Account
- If the user is signed in, show their profile chip and account actions instead
- Keep the panel light, quiet, and focused on one task
- Avoid adding a separate auth page unless a later step needs it

### UI pieces

- Dashboard landing page
- Profile summary card
- Navigation tabs for History, Saved, Progress, and Settings

### Deliverables

- [ ] Signed-in account shell
- [ ] Slide-over sign in panel
- [ ] Slide-over register panel
- [ ] User profile header
- [ ] Navigation between account sections
- [ ] Responsive layout for mobile and desktop

### Why this comes first

This gives us the structure before we add stored data. It also lets us design the account experience without waiting on every backend feature.

### Implementation Order for Auth UI

1. Add the account button and drawer trigger
2. Build the drawer shell and backdrop
3. Add sign in form
4. Add register form
5. Connect Supabase auth actions
6. Show signed-in profile state

## Supabase Setup Checklist

Before we code the account UI, set up these Supabase pieces:

### 1. Create the Supabase project

- Create a new Supabase project
- Save the project URL and anonymous key
- Keep the service role key private and server-only

### 2. Enable authentication

- Turn on email sign-up and sign-in
- Decide whether to allow magic link, email/password, or both
- Set redirect URLs for local development and production

### 3. Create the first tables

- `profiles` for user display data
- `quiz_attempts` for quiz history and scores
- `saved_quizzes` for bookmarked quizzes or questions

### 4. Define the minimum fields

- `profiles`: user_id, display_name, avatar_url, created_at
- `quiz_attempts`: user_id, topic, subject, level, test_mode, score, total_questions, time_taken, completed_at, review_data
- `saved_quizzes`: user_id, quiz_id, topic, saved_at, notes

### 5. Add row level security

- Enable RLS on every table
- Add policies so users can only read and write their own rows
- Keep any admin-style queries server-side only

### 6. Decide storage rules

- Use storage only if we later add avatars or file uploads
- Keep quiz history in Postgres, not in storage

### 7. Connect the app

- Add Supabase environment variables to the Angular app and API server
- Create a small database service layer
- Store the first quiz attempt after sign-in
- Current Supabase project ID: `scobcpwhtvprxtfzuvjc`
- Current browser client key is set for local app wiring

### 8. Verify the auth flow

- Sign up a test account
- Log in and out from the UI
- Confirm a user can only see their own history

### Recommended order inside Supabase

1. Project and auth
2. Profiles table
3. Quiz attempts table
4. Saved quizzes table
5. RLS policies
6. App connection

### Still needed later

- Final deployed site URL for production auth redirects
- Auth method choice if you want to narrow it to password only or magic link only
- Database schema confirmation before writing data from the UI

## Phase 2: Activity History

### What to build

- List of past quizzes
- Date, topic, subject, mode, and score summary
- Search or filter by topic, subject, or date
- Quick reopen action for the latest quiz

### Deliverables

- [ ] Quiz history list
- [ ] Filters for recent activity
- [ ] Empty state when no history exists
- [ ] Link from history item to quiz review

### Suggested data fields

- Quiz title or topic
- Subject
- Test mode
- Score
- Time taken
- Attempt date

## Phase 3: Review and Saved Content

### What to build

- Question-by-question review view
- Correct answer and explanation display
- Save or bookmark a quiz
- Save individual questions or topics

### Deliverables

- [ ] Quiz review page
- [ ] Saved quizzes section
- [ ] Bookmark toggle for questions
- [ ] Retry quiz action

### Why this matters

This gives the account real utility beyond just showing a list. Users can learn from mistakes and return to content later.

## Phase 4: Progress and Insights

### What to build

- Progress chart over time
- Accuracy by topic and subject
- Weak-topic highlights
- Streak or completion stats

### Deliverables

- [ ] Progress summary cards
- [ ] Accuracy chart or simple graph
- [ ] Weak topic insights
- [ ] Streak or quiz count stats

### Nice-to-have ideas

- Most improved topic
- Most attempted subject
- Daily or weekly activity summary

## Phase 5: Settings and Personalization

### What to build

- Display name and avatar
- Learning mode defaults
- Timer preferences
- Theme or accessibility options
- Account deletion or export options

### Deliverables

- [ ] Profile settings page
- [ ] Default quiz preference settings
- [ ] Export history option
- [ ] Privacy and account management actions

## Timeline

### Week 1

- Design the account shell
- Decide auth approach
- Define the data model for history and results
- Build the UI skeleton with empty states

### Week 2

- Store and render quiz history
- Add filters and quick reopen actions
- Connect history to quiz review

### Week 3

- Add saved quizzes and question bookmarks
- Build the review screen
- Add retry flow

### Week 4

- Add progress charts and weak-topic insights
- Add profile settings and preferences
- Polish responsiveness and empty states

## Data To Store

At minimum, each quiz attempt should store:

- User ID
- Quiz ID
- Topic
- Subject
- Level
- Test mode
- Score
- Total questions
- Time taken
- Date completed
- Review data

## MVP Recommendation

If we want the fastest useful version, build these first:

- Account shell
- Quiz history
- Result review
- Saved quizzes

That will make the account feel valuable before we invest in heavier analytics or advanced personalization.

## Open Decisions

- Which auth provider should we use?
- Do we want public accounts or email-only private accounts?
- Should history be stored per attempt or grouped by quiz topic?
- Do we want bookmarks for full quizzes, individual questions, or both?
