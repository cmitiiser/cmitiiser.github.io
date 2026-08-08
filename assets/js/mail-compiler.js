let templateHTML = '';

fetch('./assets/template/template.html')
  .then(response => {
    if (!response.ok) throw new Error('Failed to load template.html');
    return response.text();
  })
  .then(data => {
    templateHTML = data;
    updateOutput();
  })
  .catch(err => console.error('Error loading template:', err));

const defaultDSL = `
// Global Directives
.title: Feature Showcase & Integration Testing Guide

// Banner / Header Image Block
img {
  https://picsum.photos/600/250
}
.width: 100%
.align: center
.alt: Feature Showcase Header Banner

// Introductory Paragraph with Inline Formatting
p {
  Welcome to the **Email Builder DSL** test template! This script is designed as a *comprehensive boilerplate* to demonstrate every block type, modifier property, and text formatting option supported by the compiler.
}
.color: #2c3e50
.font-size: 16px
.line-height: 1.6
.align: left
.margin: 15px 0

// Horizontal Divider (Dashed)
div {}
.border-top: 1px dashed #0066cc
.margin: 25px 0

// Unordered List Block (Custom List Style & Spacing)
list {
  * **Global Directives:** Title assignment via .title: directive
  * **Inline Formatting:** Supports **bold**, *italics*, and smart hyperlinking
  * **Auto-prefixed Link:** Visit [IISER TVM CMIT](cmit.iisertvm.ac.in) for details
  * **Explicit Web Link:** Check [Google](https://www.google.com) safely
  * **Email Link Scheme:** Contact [Support Team](mailto:support@example.com) directly
}
.padding: 10px 0 10px 20px
.margin: 10px 0
.color: #34495e
.font-size: 15px
.line-height: 1.5

// Secondary Divider (Solid Border)
div {}
.border-top: 2px solid #cccccc
.margin: 20px 0

// Ordered List Block (Step-by-Step Guide)
ol {
  1. **Configure Directives:** Set your global template variables at the top.
  2. **Build Content:** Combine \`p\`, \`list\`, \`ul\`, \`ol\`, and \`img\` blocks.
  3. **Apply Modifiers:** Add \`.property: value\` modifiers directly after closing braces \`}\`.
  4. **Easy Compile:** Render clean, email-compliant HTML automatically!
}
.padding: 5px 0 5px 20px
.margin: 15px 0
.font-size: 14px
.color: #27ae60

// Paragraph Block with Preserved Formatting (.pre: true)
p {
  System Status Log:
    - Block Compiler : OK
    - Link Target    : target="_blank"
    - Output Mode    : Email HTML Wrapped
}
.pre: true
.color: #555555
.font-size: 13px
.line-height: 1.4
.margin: 20px 0
.padding: 12px
.align: left

// Unstyled Bullet List (list-style: none)
ul {
  * *Note:* This list demonstrates the \`.list-style: none\` modifier.
  * Bullet symbols and default left padding are removed.
}
.list-style: none
.padding: 0
.margin: 15px 0
.color: #7f8c8d
.font-size: 13px

// Closing Paragraph
p {
  For more information or inquiries, feel free to reach out to the [CMIT Website Team](mailto:mathsclub@iisertvm.ac.in).
}
.align: center
.color: #888888
.font-size: 12px
.margin: 30px 0 10px 0`;

let generatedHTML = "";

function parseInlineMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl) && !/^mailto:/i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      return `<a href="${cleanUrl}" target="_blank" style="color: #0066cc; text-decoration: underline;">${label}</a>`;
    });
}

function compileEmailTemplate(dslInput) {
  if (!templateHTML) return 'Loading template...';

  const lines = dslInput.split("\n");
  let title = "CMIT Announcement";
  let blocks = [];
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith("//")) {
      if (!currentBlock) continue;
    }

    if (line.startsWith(".title:") && !currentBlock) {
      title = line.substring(7).trim();
      continue;
    }

    if (line.endsWith("{}") && !currentBlock) {
      const blockType = line.slice(0, -2).trim();
      blocks.push({ type: blockType, bodyLines: [], props: {} });
      continue;
    }

    if (line.endsWith("{") && !currentBlock) {
      const blockType = line.slice(0, -1).trim();
      currentBlock = { type: blockType, bodyLines: [], props: {} };
      continue;
    }

    if (line === "}" && currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
      continue;
    }

    if (currentBlock) {
      currentBlock.bodyLines.push(rawLine);
      continue;
    }

    if (line.startsWith(".") && blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const key = line.substring(1, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        lastBlock.props[key] = value;
      }
    }
  }

  const renderedContent = blocks.map(renderBlock).join("\n\n");

  return templateHTML
    .replace("${Title}", title)
    .replace("${Content}", renderedContent);
}

function renderBlock(block) {
  const props = block.props;
  let styleRules = [];

  if (block.type === "div") {
    const borderTop = props["border-top"] || "2px solid #cccccc";
    const margin = props["margin"] || "30px 0";

    if (props["align"]) styleRules.push(`text-align: ${props["align"]};`);
    if (props["padding"]) styleRules.push(`padding: ${props["padding"]};`);

    const extraStyles = styleRules.length > 0 ? " " + styleRules.join(" ") : "";
    return `<div style="border-top: ${borderTop}; margin: ${margin};${extraStyles}"></div>`;
  }

  if (props["align"]) styleRules.push(`text-align: ${props["align"]};`);
  if (props["margin"]) styleRules.push(`margin: ${props["margin"]};`);
  if (props["padding"]) styleRules.push(`padding: ${props["padding"]};`);
  if (props["font-size"]) styleRules.push(`font-size: ${props["font-size"]};`);
  if (props["line-height"]) styleRules.push(`line-height: ${props["line-height"]};`);
  if (props["color"]) styleRules.push(`color: ${props["color"]};`);

  let rawBodyText =
    props["pre"] === "true"
      ? block.bodyLines.join("\n")
      : block.bodyLines
          .map((l) => l.trim())
          .filter(Boolean)
          .join(" ");

  switch (block.type) {
    case "img": {
      let imgUrl = rawBodyText.trim();

      if (imgUrl && !/^https?:\/\//i.test(imgUrl)) {
        imgUrl = "https://" + imgUrl;
      }

      const imgStyleRules = ["display: block;", "max-width: 100%;", "height: auto;", "border: 0;"];

      if (props["align"] === "center") {
        imgStyleRules.push("margin-left: auto;", "margin-right: auto;");
      } else if (props["align"] === "right") {
        imgStyleRules.push("margin-left: auto;", "margin-right: 0;");
      }

      if (props["width"]) imgStyleRules.push(`width: ${props["width"]};`);
      if (props["margin"]) imgStyleRules.push(`margin: ${props["margin"]};`);

      const altText = props["alt"] || "Image";
      const imgTag = `<img src="${imgUrl}" alt="${altText}" style="${imgStyleRules.join(" ")}" />`;

      const textAlign = props["align"] || "left";
      return `<div align="${textAlign}" style="text-align: ${textAlign}; width: 100%;">${imgTag}</div>`;
    }

    case "p": {
      const parsedText = parseInlineMarkdown(rawBodyText);
      const preStyle = props["pre"] === "true" ? "white-space: pre-wrap;" : "";
      const combinedStyle = [styleRules.join(" "), preStyle]
        .filter(Boolean)
        .join(" ");
      const attr = combinedStyle ? ` style="${combinedStyle}"` : "";
      return `<p${attr}>${parsedText}</p>`;
    }

    case "list":
    case "ul":
    case "ol": {
      const explicitListStyle = props["list-style"];
      const isNone = explicitListStyle === "none";

      if (explicitListStyle) {
        styleRules.push(`list-style-type: ${explicitListStyle};`);
      } else {
        styleRules.push("list-style-type: none;");
      }

      if (!props["padding"]) {
        styleRules.push(isNone ? "padding-left: 0;" : "padding-left: 10px;");
      }

      const listItems = block.bodyLines
        .map((l) => l.trim())
        .filter((l) => l.startsWith("*") || l.startsWith("-") || /^\d+\./.test(l))
        .map((l) => {
          let prefix = "";
          let itemContent = l;

          if (l.startsWith("*") || l.startsWith("-")) {
            itemContent = l.replace(/^(\*|-)\s*/, "");
            if (!isNone) {
              prefix = "• ";
            }
          } else if (/^\d+\./.test(l)) {
            const match = l.match(/^(\d+\.)\s*/);
            if (match) {
              itemContent = l.substring(match[0].length);
              if (!isNone) {
                prefix = match[1] + " ";
              }
            }
          }

          return `  <li style="margin-bottom: 6px;">${prefix}${parseInlineMarkdown(itemContent)}</li>`;
        })
        .join("\n");

      const attr = styleRules.length > 0 ? ` style="${styleRules.join(" ")}"` : "";
      return `<ul${attr}>\n${listItems}\n</ul>`;
    }

    default: {
      const attr = styleRules.length > 0 ? ` style="${styleRules.join(" ")}"` : "";
      return `<div${attr}>${parseInlineMarkdown(rawBodyText)}</div>`;
    }
  }
}

const dslTextarea = document.getElementById("dsl-input");
const previewFrame = document.getElementById("html-preview");
const codeContainer = document.getElementById("html-code");

const cm = CodeMirror.fromTextArea(dslTextarea, {
  mode: "cmitdsl",
  theme: "cmit",
  lineNumbers: true,
  lineWrapping: true,
  styleActiveLine: true,
  matchBrackets: true,
  tabSize: 2,
  extraKeys: {
    Tab: (cmInstance) => cmInstance.replaceSelection("  ")
  }
});

requestAnimationFrame(() => {
  cm.refresh();
});

function updateOutput() {
  generatedHTML = compileEmailTemplate(cm.getValue());
  previewFrame.srcdoc = generatedHTML;
  codeContainer.textContent = generatedHTML;
}

cm.setValue(defaultDSL);
cm.on("change", updateOutput);

function switchTab(tab) {
  const darkToggleBtn = document.getElementById("toggle-dark-mode-btn");
  const copyCodeBtn = document.getElementById("copy-code-btn");

  if (tab === "preview") {
    previewFrame.style.display = "block";
    codeContainer.style.display = "none";
    document.getElementById("tab-preview").classList.add("active");
    document.getElementById("tab-code").classList.remove("active");

    if (darkToggleBtn) darkToggleBtn.style.display = "flex";
    if (copyCodeBtn) copyCodeBtn.style.display = "none";
  } else {
    previewFrame.style.display = "none";
    codeContainer.style.display = "block";
    document.getElementById("tab-code").classList.add("active");
    document.getElementById("tab-preview").classList.remove("active");

    if (darkToggleBtn) darkToggleBtn.style.display = "none";
    if (copyCodeBtn) copyCodeBtn.style.display = "flex";
  }
}

function downloadHTML() {
  if (!generatedHTML) return;

  // 1. Create a Blob object containing the compiled HTML
  const blob = new Blob([generatedHTML], { type: "text/html;charset=utf-8" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  
  link.download = "quill-mail.html";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function copyToClipboard() {
  if (!generatedHTML) return;

  navigator.clipboard.writeText(generatedHTML).then(() => {
    // Select whichever copy button is currently present/rendered
    const btn = document.getElementById("copy-code-btn") || document.getElementById("copy-btn");
    if (btn) {
      btn.classList.add("is-copied");
      setTimeout(() => btn.classList.remove("is-copied"), 2000);
    }
  }).catch(err => {
    console.error("Failed to copy code: ", err);
  });
}

/* ---- Documentation modal ---- */

const docsModal = document.getElementById("docs-modal");
document.getElementById("docs-btn").addEventListener("click", () => docsModal.showModal());
document.getElementById("docs-close").addEventListener("click", () => docsModal.close());



let isDarkModePreview = false;

function toggleDarkModePreview() {
  isDarkModePreview = !isDarkModePreview;
  const btn = document.getElementById("toggle-dark-mode-btn");

  if (isDarkModePreview) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }

  applyDarkModeToIframe();
}

function applyDarkModeToIframe() {
  const iframe = document.getElementById("html-preview");
  if (!iframe) return;

  if (isDarkModePreview) {
    iframe.classList.add("ios-dark-mode");

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (iframeDoc && iframeDoc.head) {
      let darkStyle = iframeDoc.getElementById("ios-dark-mode-style");
      if (!darkStyle) {
        darkStyle = iframeDoc.createElement("style");
        darkStyle.id = "ios-dark-mode-style";
        iframeDoc.head.appendChild(darkStyle);
      }

      darkStyle.textContent = `
        img, [style*="background-image"] {
          filter: brightness(89%) contrast(122%) hue-rotate(180deg) invert(100%) !important;
        }
      `;
    }
  } else {
    iframe.classList.remove("ios-dark-mode");
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (iframeDoc) {
      const darkStyle = iframeDoc.getElementById("ios-dark-mode-style");
      if (darkStyle) darkStyle.remove();
    }
  }
}


const originalUpdateOutput = updateOutput;
updateOutput = function () {
  originalUpdateOutput();

  setTimeout(applyDarkModeToIframe, 50);
};


async function copyRenderedHTML() {
  if (!generatedHTML) return;

  try {
    const htmlBlob = new Blob([generatedHTML], { type: "text/html" });
    const textBlob = new Blob([generatedHTML], { type: "text/plain" });

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);

    const btn = document.getElementById("copy-rendered-btn");
    if (btn) {
      btn.classList.add("is-copied");
      setTimeout(() => btn.classList.remove("is-copied"), 2000);
    }
  } catch (err) {
    console.error("Failed to copy rendered GUI: ", err);
  }
}

function copyRawHTML() {
  if (!generatedHTML) return;

  navigator.clipboard.writeText(generatedHTML).then(() => {
    const btn = document.getElementById("copy-code-btn");
    if (btn) {
      btn.classList.add("is-copied");
      setTimeout(() => btn.classList.remove("is-copied"), 2000);
    }
  }).catch(err => {
    console.error("Failed to copy raw HTML: ", err);
  });
}