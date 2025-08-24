# Development Workflow

This document outlines our standardized development process for implementing new features and bug fixes in the ungry project.

## Workflow Overview

Our development follows a structured 8-step process that ensures quality, testing, and proper code review:

1. **Feature/Bug Request** - User describes the feature or bug
2. **Issue Creation** - Create GitHub issue with detailed description
3. **Feature Branch** - Create dedicated branch for the work
4. **Implementation** - Code the solution with incremental commits
5. **Local Testing** - Test on localhost and get user confirmation
6. **Push & Preview** - Push to feature branch for preview testing
7. **Pull Request** - Create PR after preview confirmation
8. **Merge & Close** - Merge PR and close related issue

## Detailed Process

### Step 1: Feature/Bug Request
- User describes the desired feature or reports a bug
- Include context, expected behavior, and any technical details
- Clarify requirements if needed

### Step 2: Issue Creation
- Create GitHub issue with descriptive title
- Use appropriate labels (enhancement, bug, etc.)
- Include detailed description with:
  - Current behavior vs expected behavior
  - Technical details and requirements
  - Acceptance criteria
  - Security considerations (if applicable)

### Step 3: Feature Branch Creation
- Create branch from main using conventional naming:
  - `feat/feature-name` for new features
  - `fix/bug-description` for bug fixes
  - `chore/task-description` for maintenance tasks
- Switch to the new branch locally

**Exception**: `chore` and `docs` changes can be committed directly to main branch without creating a feature branch, as they typically don't affect application functionality.

**Exception**: `chore` and `docs` changes can be committed directly to main branch without creating a feature branch, as they typically don't affect application functionality.

### Step 4: Implementation
- Implement the solution with incremental commits
- Follow conventional commit format (see git-conventions.md)
- Write clean, well-documented code
- Include error handling and edge cases
- Make atomic commits that can be easily reviewed

### Step 5: Local Testing & Confirmation
- Test the implementation thoroughly on localhost
- Verify all functionality works as expected
- Test edge cases and error scenarios
- **CRITICAL**: Ask user to confirm the implementation is working correctly
- Do not proceed until user explicitly confirms functionality

### Step 6: Push & Preview Testing
- Push changes to the feature branch
- User tests the preview deployment
- Address any issues found during preview testing
- **CRITICAL**: Wait for user confirmation that preview is working correctly

### Step 7: Pull Request
- Create PR only after preview confirmation
- Include comprehensive PR description with:
  - Summary of changes
  - Testing performed
  - Screenshots/demos if applicable
  - Reference to related issue (use "Closes #X")
- Request review if needed

### Step 8: Merge & Close
- Merge PR using squash merge for clean history
- Verify issue is automatically closed
- Update local main branch
- Clean up feature branch if desired

## Key Principles

### Quality Assurance
- Every change must be tested locally before pushing
- User confirmation is required at both local and preview stages
- No shortcuts on testing - quality over speed

### Communication
- Always ask for explicit user confirmation before proceeding
- Be clear about what needs to be tested
- Document any assumptions or decisions made

### Security & Best Practices
- Follow security best practices for all implementations
- Maintain consistent code style and patterns
- Use appropriate error handling and user feedback

### Git Hygiene
- Use conventional commit messages
- Keep commits atomic and focused
- Maintain clean branch history with squash merges

## Testing Checklist

Before asking for user confirmation, ensure:
- [ ] Feature/fix works as described in the issue
- [ ] No console errors or warnings
- [ ] Error handling works correctly
- [ ] UI/UX is consistent with existing design
- [ ] Performance is acceptable
- [ ] Security considerations are addressed
- [ ] Edge cases are handled appropriately

## Direct to Main Exceptions

The following types of changes can be committed directly to main without the full workflow:

### Chore Changes
- Dependency updates
- Build configuration changes
- Development tooling updates
- Package.json modifications
- Environment configuration updates

### Documentation Changes
- README updates
- Code comments
- Documentation files
- Steering rule updates
- Configuration documentation

**Process for Direct Commits:**
1. Make changes on main branch
2. Test locally if applicable
3. Commit with conventional format (`chore:` or `docs:`)
4. Push directly to main

## Emergency Hotfixes

For critical production issues:
1. Create hotfix branch from main
2. Implement minimal fix
3. Test locally with user confirmation
4. Create PR with "hotfix:" prefix
5. Fast-track review and merge
6. Monitor production after deployment

## Direct to Main Exceptions

The following types of changes can be committed directly to main without the full workflow:

### Chore Changes
- Dependency updates
- Build configuration changes
- Development tooling updates
- Package.json modifications
- Environment configuration updates

### Documentation Changes
- README updates
- Code comments
- Documentation files
- Steering rule updates
- Configuration documentation

**Process for Direct Commits:**
1. Make changes on main branch
2. Test locally if applicable
3. Commit with conventional format (`chore:` or `docs:`)
4. Push directly to main

## Notes

- This workflow ensures high quality and reduces production issues
- User confirmation at key stages prevents misunderstandings
- Structured approach makes development predictable and reliable
- Always prioritize user experience and code quality over speed