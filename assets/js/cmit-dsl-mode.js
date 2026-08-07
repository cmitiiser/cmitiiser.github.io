CodeMirror.defineSimpleMode("cmitdsl", { // Matches mode: "cmitdsl" in your compiler
  start: [
    // Comments: // ...
    { regex: /\/\/.*/, token: "comment" },

    // Title directive: .title:
    { regex: /\.title(?=\s*:)/, token: "keyword" },

    // Property keys following a block: .margin:, .align:, .font-size:, etc.
    { regex: /\.[a-zA-Z0-9_-]+(?=\s*:)/, token: "def" },

    // Colons
    { regex: /:/, token: "operator" },

    // Property Values (colors, units, alignment keywords, booleans)
    { regex: /#(?:[0-9a-fA-F]{3}){1,2}\b/, token: "number" },
    { regex: /\b(true|false|none|center|left|right|justify)\b/, token: "atom" },
    { regex: /\b\d+(?:px|em|rem|%)?\b/, token: "number" },

    // Block Declarations: p {, list {, ul {, ol {, img {, div {, div {}
    { regex: /\b(p|ul|ol|list|img|div|quote)\b(?=\s*\{)/, token: "tag" },

    // Braces
    { regex: /[\{\}]/, token: "bracket" },

    // Inline Markdown
    { regex: /\*\*.*?\*\*/, token: "strong" },
    { regex: /\*.*?\*/, token: "em" },
    { regex: /\[.*?\]\(.*?\)/, token: "link" }
  ],
  meta: {
    lineComment: "//"
  }
});