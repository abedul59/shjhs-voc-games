# Repository guidance for AI agents

## Student login migration

Before changing student authentication, student imports, promotion/renumbering, or progress ownership, read both documents completely:

- `docs/student-number-login-phase1.md`
- `docs/student-number-login-roadmap.md`

Non-negotiable compatibility rules:

- `students.student_id` is the existing internal game-account key used by many progress and activity tables. Do not overwrite it with the school's official student number and do not derive a new value during ordinary class or seat changes without a complete, verified reference migration.
- `students.school_student_id` is the official school student number and is an additional login identifier. Both login identifiers must resolve to the same existing student row and the same `student_id`.
- The existing password remains `pin_code` unless the user explicitly requests a password migration.
- Keep an admin-controlled rollback path that can restore the original class＋seat login without deleting official student numbers, passwords, students, or progress.
- A database migration and student-number import must be complete before enabling a new grade. If the schema is missing, the application must fail safely to the legacy login mode.
- Never commit real student rosters or student PII to the repository. Import files stay outside Git.

Current rollout begins with grade 7 in school year 115 (August 2026). The intended natural transition reaches all grades in school year 117 (August 2028). Do not silently expand eligible grades or remove legacy login; follow the gates in the roadmap and report migration counts and exceptions.

Repository deployment topology:

- `lawxstudent168-cyber/shjhs-voc-games` is the newer project/source repository.
- `abedul59/shjhs-voc-games` is the older production repository and may require a cross-fork pull request because the newer-project credential cannot push to it directly.
- Build and verify each repository on its own current `main`; their histories and trees are not assumed to be identical.
