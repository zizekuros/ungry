# Git Commit Conventions

## Conventional Commits Format

Always use Conventional Commits format when creating commit messages. Prepend all commit messages with the appropriate type followed by a colon and space.

### Commit Types

- **feat:** new features or functionality
- **fix:** bug fixes
- **docs:** documentation changes (README, comments, etc.)
- **chore:** maintenance tasks (dependencies, build config, tooling)
- **refactor:** code changes that don't add features or fix bugs
- **style:** formatting, whitespace, missing semicolons (no logic changes)
- **test:** adding or updating tests
- **ci:** continuous integration and deployment changes
- **perf:** performance improvements

### Examples

- `feat: add user authentication system`
- `fix: resolve Docker environment variable issue`
- `docs: update installation instructions`
- `chore: update dependencies to latest versions`
- `refactor: extract utility functions to separate module`
- `style: fix indentation and remove trailing whitespace`
- `test: add unit tests for shopping list component`
- `ci: update Docker build workflow`
- `perf: optimize list rendering performance`

### Guidelines

- Keep messages concise but descriptive
- Use lowercase after the colon
- Use imperative mood ("add" not "added" or "adds")
- No period at the end of the message
- Maximum 72 characters for the subject line