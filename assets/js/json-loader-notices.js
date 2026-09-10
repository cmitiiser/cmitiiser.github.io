document.addEventListener("DOMContentLoaded", () => {
  const target = document.getElementById("notices-target");

  function renderMarkdown(str) {
    if (!str) return "";
    return str
      .replace(/<sup>(.*?)<\/sup>/gi, "___SUP_O___$1___SUP_C___")
      .replace(/<sub>(.*?)<\/sub>/gi, "___SUB_O___$1___SUB_C___")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/___SUP_O___(.*?)___SUP_C___/g, "<sup>$1</sup>")
      .replace(/___SUB_O___(.*?)___SUB_C___/g, "<sub>$1</sub>")
      .replace(/\^\{(.*?)\}/g, "<sup>$1</sup>")
      .replace(/\^([^\s^]+)\^/g, "<sup>$1</sup>")
      .replace(/_\{(.*?)\}/g, "<sub>$1</sub>")
      .replace(/~([^\s~]+)~/g, "<sub>$1</sub>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /\[(.*?)\]\((https?:\/\/.*?|\/.*?|.*?\.html)\)/g,
        '<a href="$2">$1</a>',
      );
  }

  fetch("/data/notices.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((notices) => {
      if (!notices || !notices.length) {
        target.innerHTML =
          '<li><span class="notice-index">--</span><span>No active notices at this time.</span></li>';
        return;
      }

      // Take only the top 3 latest notices
      const topNotices = notices.slice(0, 3);

      target.innerHTML = topNotices
        .map((n, idx) => {
          const indexFormatted = String(idx + 1).padStart(2, "0");
          const content = typeof n === "string" ? n : n.text || "";
          return `
                  <li>
                    <span class="notice-index">${indexFormatted}</span>
                    <span>${renderMarkdown(content)}</span>
                  </li>
                `;
        })
        .join("");
    })
    .catch((err) => {
      console.error(err);
      target.innerHTML =
        '<li><span class="notice-index">--</span><span>Failed to load notices.</span></li>';
    });
});
