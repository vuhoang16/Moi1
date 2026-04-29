Review the mobile app code in $ARGUMENTS for issues. If no path is specified, review all recently changed files.

First, detect the mobile platform (React Native, Flutter, Swift, Kotlin) by checking for package.json, pubspec.yaml, .xcodeproj, or build.gradle.

Do a comprehensive mobile-specific review covering:

1. **Syntax**: Run `npx tsc --noEmit`, `dart analyze`, `swiftc -typecheck`, or equivalent
2. **Completeness**: Grep for TODOs, placeholders, empty function bodies, unused imports
3. **Type Safety**: Check for `any` (TS) / `dynamic` (Dart) usage, missing schema validation on API responses, force unwraps
4. **Architecture**: Business logic separated from UI, API layer abstracted, no circular dependencies
5. **Mobile UI/UX**: Touch targets (≥48dp), safe area handling, keyboard avoidance, loading/empty states, platform-correct navigation, haptic feedback
6. **Push Notifications**: Permission timing, tap handling, notification channels (Android), malformed payload resilience
7. **Accessibility**: Missing accessibility labels, color contrast (4.5:1), screen reader order, dynamic type, reduced motion
8. **Performance**: Inline styles in render, ScrollView+map vs FlatList/FlashList, missing useCallback/useMemo/React.memo, images without dimensions, main thread work, leaked subscriptions/timers, cold start bloat, bundle size
9. **Security (OWASP MASVS)**: Hardcoded secrets, insecure storage (AsyncStorage vs Keychain/SecureStore), HTTP vs HTTPS, disabled SSL, unvalidated deep links, eval(), obfuscation, dependency vulnerabilities (`npm audit`)
10. **Crash Resilience**: Missing error boundaries, unhandled promise rejections, no optional chaining on API responses, no crash reporting
11. **Navigation & State**: Back navigation, deep linking, unbounded stack growth, state management consistency, offline handling
12. **i18n**: Hardcoded strings, left/right vs start/end (RTL), non-locale-aware date/number formatting
13. **Testing**: Missing unit/component/E2E tests for new code
14. **Store Compliance**: Unnecessary permissions, missing usage descriptions, privacy manifests (Apple), account deletion, IAP flows, placeholder content, reviewer access credentials

For each issue found, report:
- ❌ **Critical**: Crashes, security flaws, broken UX, store rejection risks
- ⚠️ **Warning**: Performance issues, missing error handling, platform inconsistencies, a11y gaps
- 💡 **Suggestion**: Polish, better patterns, test coverage improvements

Be specific — cite file names, line numbers, and the problematic code. For every issue, suggest a concrete fix with a code snippet.

End with a one-line verdict: SHIP IT ✅, FIX FIRST ⚠️, or BLOCKED ❌
