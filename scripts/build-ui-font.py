#!/usr/bin/env python3
"""Build public/fonts/noto-serif-sc-ui.woff2.

The site's fixed headings (section titles, page titles, the homepage copy) are
set in Noto Serif SC Black. The full font arrives in on-demand slices from
@fontsource/noto-serif-sc; this script cuts one small file holding only the
characters that appear in the site's own source, so those headings can be
preloaded and never flash a fallback face.

Re-run after changing Chinese copy in pages/, components/ or lib/profile.js:

    pip install fonttools brotli
    python3 scripts/build-ui-font.py "path/to/NotoSerifSC[wght].ttf"

The source font is ofl/notoserifsc in https://github.com/google/fonts (OFL 1.1).
"""
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES = [*ROOT.glob("pages/**/*.js"), *ROOT.glob("components/*.js"), ROOT / "lib" / "profile.js"]


def is_cjk(ch):
    code = ord(ch)
    return (
        0x4E00 <= code <= 0x9FFF  # unified ideographs
        or 0x3000 <= code <= 0x303F  # CJK punctuation
        or 0xFF00 <= code <= 0xFFEF  # full-width forms
        or ch in "“”‘’…—·"
    )


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    chars = sorted({ch for path in SOURCES for ch in path.read_text(encoding="utf-8") if is_cjk(ch)})
    font = instancer.instantiateVariableFont(TTFont(sys.argv[1]), {"wght": 900})
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(text="".join(chars))
    subsetter.subset(font)
    out = ROOT / "public" / "fonts" / "noto-serif-sc-ui.woff2"
    font.flavor = "woff2"
    font.save(out)
    print(f"{len(chars)} characters -> {out.relative_to(ROOT)} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
