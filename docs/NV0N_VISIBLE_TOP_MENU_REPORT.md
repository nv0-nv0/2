# NV0N visible top menu patch report

## Summary
- Replaced the inconsistent NV0N swapped-page top navigation with a single persistent header component.
- Removed breakpoint-hidden navigation patterns from the swapped-page topbars so page movement remains available on desktop and mobile.
- Added direct topbar links for: 위험 진단, 서비스, 요금 안내, 인사이트, 내 사이트, 문의하기.
- Converted non-clickable `nv0` logo text on demo/portal-style pages into a home link.
- Added responsive CSS for small screens: the top menu stays visible and scrolls horizontally instead of disappearing.
- Extended `validate:nv0n` to fail when a swapped page topbar is missing required navigation links or still contains breakpoint-hidden menu classes.

## Patched pages
- `/`
- `/service`
- `/plans`
- `/demo`
- `/products/veridion/demo`
- `/portal`
- `/board`

## Validation commands run
```bash
npm run check:syntax
npm run check:pages
npm run test:routes
npm run check:links -- --summary
npm run validate:nv0n
npm test
npm run test:phase260
npm run validate:phase260
```

## Result
All listed checks passed.
