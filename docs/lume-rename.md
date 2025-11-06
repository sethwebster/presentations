# Rename "Presentation Framework" to "Lume" - Complete Migration Plan

## Scope
Rename all references from "presentation-framework" to "lume" across the entire codebase, maintaining backward compatibility where needed.

## Phase 1: Directory Structure (Critical Path)

### 1.1 Rename Root Directory
- `presentation-framework/` → `lume/`
- Update parent `.vercel/project.json` rootDirectory
- This affects all relative paths

### 1.2 Update Vercel Configuration
- `.vercel/project.json`: Change `"rootDirectory": "presentation-framework"` → `"rootDirectory": "lume"`
- May need to redeploy or clear Vercel cache

## Phase 2: Package & Build Configuration

### 2.1 package.json
- `"name": "presentation-framework"` → `"name": "lume"`
- `"description"`: Update to mention Lume
- No changes to dependencies needed

### 2.2 CI/CD Workflows
**File**: `.github/workflows/ci.yml`
- All 13 instances of `presentation-framework` → `lume`
- Paths: `lume/package-lock.json`, `lume/playwright-report/`, `lume/coverage`
- Codecov name: `codecov-lume`

### 2.3 Vercel Build Output (Regenerate)
- Delete `.vercel/output/` directory
- Will be regenerated on next build with correct paths

## Phase 3: Documentation

### 3.1 README.md
- Title: `# Presentation Framework` → `# Lume`
- Subtitle: "A reusable presentation framework" → "A modern presentation framework"
- All prose references

### 3.2 Other Documentation
- `REALTIME.md`: Update paths and references
- `docs/ai-powered-presentation-roadmap.md`: Update project name
- `docs/lume-rsc-format.md`: Already uses Lume ✓
- `docs/REFACTORING_SUMMARY.md`: Update title
- `src/presentations/README.md`: Update framework name

### 3.3 HTML Title
**File**: `index.html`
- Already says `Lume - Presentation Framework` ✓
- Change to just `Lume` or `Lume Presentations`

## Phase 4: Code References

### 4.1 Display Text
**File**: `src/PresentationLoader.tsx:3`
- Loading screen: "Presentation Framework" → "Lume"

### 4.2 Comments & JSDoc
**File**: `src/presentations/jsconf-2025-react-foundation.tsx:2`
- "loaded by the Presentation Framework" → "loaded by Lume"

### 4.3 Variable Names (Optional - Breaking Change)
Currently no code variables use "presentationFramework" - good!

## Phase 5: Environment & Secrets

### 5.1 localStorage Keys (Backward Compatible)
Current keys already use `lume-` prefix:
- `lume-presenter-token` ✓
- `lume-autopilot-threshold` ✓

### 5.2 Environment Variables (Already Lume)
- `LUME_CONTROL_SECRET` ✓
- `VITE_LUME_CONTROL_SECRET` ✓

## Phase 6: Asset References

### 6.1 Public Assets
- Favicon already: `lume-favicon.ico` ✓
- Logo files already use Lume branding ✓

### 6.2 CSS Variables (Already Lume)
- `--lume-midnight`, `--lume-mist`, `--lume-primary`, etc. ✓

## Phase 7: Test Files

### 7.1 Test Descriptions
- Update test suite names in comments
- Update error messages that mention "Presentation Framework"

## Phase 8: NPM Package Preparation (Future)

### 8.1 package.json for Publishing
If publishing to npm:
- Package name: `@sethwebster/lume` or just `lume-presentations`
- Keywords: `["lume", "presentations", "react", "slides"]`
- Repository URL
- Homepage URL

### 8.2 Create CHANGELOG.md
Document the rename for users

## Files to Change (Summary)

### Critical (Will Break CI/Deployment):
1. Directory rename: `presentation-framework/` → `lume/`
2. `.vercel/project.json`: rootDirectory
3. `.github/workflows/ci.yml`: All 13 paths
4. `package.json`: name field

### Documentation (User-Facing):
5. `README.md`: Title and all references
6. `REALTIME.md`: Framework name
7. `index.html`: Title tag (already partial)
8. `src/PresentationLoader.tsx`: Display text
9. All docs in `docs/` directory

### Optional (Polish):
10. Test suite names
11. JSDoc comments
12. Code comments

## Migration Strategy

### Option A: Big Bang (Recommended)
1. Create migration branch
2. Rename directory
3. Update all files in one commit
4. Test build and CI
5. Merge to master
6. Redeploy to Vercel

### Option B: Gradual
1. Update documentation first
2. Update display text
3. Rename directory last
4. Multiple commits

## Risks & Mitigation

**Risk**: Breaking Vercel deployment
- **Mitigation**: Test locally first, update Vercel config before deploying

**Risk**: Breaking existing bookmarks/URLs
- **Mitigation**: Add redirects in vercel.json if needed

**Risk**: CI cache issues
- **Mitigation**: Clear GitHub Actions cache after rename

## Backward Compatibility

### What Stays the Same:
- localStorage keys (already `lume-*`)
- Environment variables (already `LUME_*`)
- CSS variables (already `--lume-*`)
- API endpoints (path-based, no framework name)
- Asset files (already use Lume naming)

### What Changes:
- npm package name
- Directory name
- CI paths
- Documentation
- Display text

## Estimated Effort
- **Renaming**: 15-20 minutes
- **Testing**: 10-15 minutes
- **Documentation**: 10 minutes
- **Vercel reconfiguration**: 5 minutes
- **Total**: ~45 minutes

## Post-Rename Checklist
- [ ] npm install works
- [ ] npm run build succeeds
- [ ] npm run test:run passes (131 tests)
- [ ] npm run lint passes
- [ ] vercel dev works
- [ ] CI pipeline runs successfully
- [ ] Deployment works on Vercel
- [ ] All URLs resolve correctly

## Commands to Execute (In Order)

```bash
# 1. Rename directory
cd /Users/sethwebster/Development/presentations
mv presentation-framework lume

# 2. Update Vercel config
# Edit .vercel/project.json: "rootDirectory": "lume"

# 3. Update package.json
cd lume
# Edit package.json: "name": "lume"

# 4. Update CI workflow
# Edit .github/workflows/ci.yml: Replace all "presentation-framework" with "lume"

# 5. Update documentation
# Edit README.md, REALTIME.md, etc.

# 6. Update display text
# Edit src/PresentationLoader.tsx, index.html, etc.

# 7. Clean Vercel cache
rm -rf ../.vercel/output

# 8. Test everything
npm install
npm run build
npm run test:run
npm run lint

# 9. Commit
git add -A
git commit -m "Rename presentation-framework to Lume"
git push

# 10. Redeploy
vercel --prod
```

## Notes

- Most of the codebase already uses "Lume" branding (CSS vars, localStorage, env vars, assets)
- The rename is mostly about the directory name and package metadata
- Internal code has zero references to "presentationFramework" variable names
- This is a polish/branding change, not an architectural change
