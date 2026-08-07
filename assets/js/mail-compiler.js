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

const defaultDSL = `.title: Movie Screening: Good Will Hunting

p {
  Hey all,
}

p {
  CMIT is celebrating Pi Week, and we are kicking things off with an exciting start! A movie that brings together math, emotions, and a whole lot of life wisdom.
}

list {
  1. **First step:** Arrive on time at 9 PM.
  2. **Second step:** Grab your snacks.
  3. **Third step:** Enjoy the movie!
}

div {}

list {
  * **Movie:** Good Will Hunting
  * **Date:** 22 March 2026 | Sunday
  * **Time:** 9 PM
  * **Venue:** PSB Seminar Hall
}
.list-style: none
.padding: 0
.margin: 20px 0
.align: center

div {}
.border-top: 1px dashed #0066cc
.margin: 20px 0

p {
  We hope to see you there!
}`;

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

/* ---- Editor wiring (CodeMirror) ---- */

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

function updateOutput() {
  generatedHTML = compileEmailTemplate(cm.getValue());
  previewFrame.srcdoc = generatedHTML;
  codeContainer.textContent = generatedHTML;
}

cm.setValue(defaultDSL);
cm.on("change", updateOutput);

function switchTab(tab) {
  const darkToggleBtn = document.getElementById("toggle-dark-mode-btn");

  if (tab === "preview") {
    previewFrame.style.display = "block";
    codeContainer.style.display = "none";
    document.getElementById("tab-preview").classList.add("active");
    document.getElementById("tab-code").classList.remove("active");
    
    if (darkToggleBtn) darkToggleBtn.style.display = "flex";
  } else {
    previewFrame.style.display = "none";
    codeContainer.style.display = "block";
    document.getElementById("tab-code").classList.add("active");
    document.getElementById("tab-preview").classList.remove("active");
    
    if (darkToggleBtn) darkToggleBtn.style.display = "none";
  }
}

function downloadHTML() {
  if (!generatedHTML) return;

  // 1. Create a Blob object containing the compiled HTML
  const blob = new Blob([generatedHTML], { type: "text/html;charset=utf-8" });

  // 2. Create a temporary invisible <a> download element
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  
  // 3. Name the downloaded file (e.g., email-template.html)
  link.download = "email-template.html";

  // 4. Trigger the download programmatically and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function copyToClipboard() {
  if (!generatedHTML) return;

  navigator.clipboard.writeText(generatedHTML).then(() => {
    const btn = document.getElementById("copy-btn");
        btn.classList.add("is-copied");
    
    setTimeout(() => {
      btn.classList.remove("is-copied");
    }, 2000);
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

      /* 
        The exact mathematical inverse filter array for <img> tags
        to restore native image colors inside the modified container:
      */
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


// Ensure dark mode filter is re-applied whenever output updates
const originalUpdateOutput = updateOutput;
updateOutput = function () {
  originalUpdateOutput();
  // Small delay to ensure iframe DOM has loaded the srcdoc
  setTimeout(applyDarkModeToIframe, 50);
};