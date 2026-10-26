# Security

Please report a vulnerability privately, through
[GitHub's private vulnerability reporting](https://github.com/SirKettle/data-profile/security/advisories/new),
not in a public issue. You should hear back within a week.

Only the latest published minor version of each package receives fixes while it is 0.x.

The packages render data their consumer supplies. Labels and other text are drawn as text, never as
HTML; category links (`href`) are rendered as given, so a consumer passing untrusted URLs should
check their scheme first. Nothing is fetched and nothing leaves the page.
