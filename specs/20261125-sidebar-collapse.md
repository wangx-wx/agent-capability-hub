# Sidebar Collapse

Desktop users can collapse the persistent navigation sidebar to an icon rail and expand it again. The selected state is stored in browser local storage and restored on reload. Navigation labels remain available as tooltips while collapsed. The mobile navigation drawer always opens expanded and does not expose the desktop collapse control.

Verification uses a browser integration test to check both widths, the collapse/expand controls, and a navigation tooltip; the Web E2E suite checks that mobile navigation and existing pages continue to work.
