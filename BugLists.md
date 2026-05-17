# This is a list of bugs that are found when testing using the app

## Dashboard
- [ ] Courses Overview isn't synced
- [ ] Priority Planner isn't set to today (Start with Jan 2026 instead of May 2026)
- [ ] Nothing shows up on the Priority Planner (Just a regular calendar with no marks)

## Passing Target
- [ ] Current grade often missing and not always be displayed (not refreshed  automatically)
- [ ] Calculation still weird
        To pass this course, you need at least 0 on Assessment1, 0 on Project1, and 100 on UAS
        Current grade: 30 — gap of 45 points to passing
- [ ] Does not update state (like passing target) on delete Assessment
- [ ] Delete Assesment is not really deleting, comes back after refreshing

## Task Value

## Priority Planner
- [ ] Time is a string, can input non time (might be intended)
- [ ] It does not display tasks in different day correctly and instead displayed in a single day (Week n Month)
- [ ] Still not persistent

## Flashcards
- [ ] Create flashcards triggered twice, making 2 flashcards

## Quiz Lab
- [ ] Create quiz triggered twice, making 2 quizzes
- [ ] Creation seems inconsistent? I input 5 questions but the AI make 10 questions

## Study Companion