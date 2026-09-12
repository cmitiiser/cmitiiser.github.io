document.addEventListener("DOMContentLoaded", () => {
  const REPO_OWNER = "cmitiiser";
  const REPO_NAME = "cmitiiser.github.io";
  const BRANCH = "main";

  const EVENTS_FILE_PATH = "data/events.json";
  const NEWSLETTERS_FILE_PATH = "data/newsletters.json";
  const NOTICES_FILE_PATH = "data/notices.json";

  const tokenInput = document.getElementById("gh-token");
  if (tokenInput) {
    tokenInput.value = localStorage.getItem("cmit_pat") || "";
    tokenInput.addEventListener("input", () => {
      localStorage.setItem("cmit_pat", tokenInput.value.trim());
      updateAllFormsValidation();
    });
  }

  const tabs = document.querySelectorAll(".cmit-tab-trigger");
  const panes = document.querySelectorAll(".cmit-tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      tabs.forEach((t) => t.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPane = document.getElementById(`pane-${target}`);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Global simple text status (exported to window so media uploader shares it)
  window.setGlobalStatus = function (msg, isError = false) {
    const el = document.getElementById("global-status");
    if (!el) return;
    el.textContent = msg;
    el.className = isError ? "cmit-global-status error" : "cmit-global-status";
  };

  function parseMarkdown(str) {
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
        '<a href="$2" target="_blank" rel="noopener">$1</a>',
      );
  }

  const eventDateInput = document.getElementById("event-date");
  const eventSubjectInput = document.getElementById("event-subject");
  const eventLinkInput = document.getElementById("event-link");
  const eventPreview = document.getElementById("event-preview");

  function updateEventPreview() {
    if (!eventPreview) return;

    const dateVal = eventDateInput ? eventDateInput.value.trim() : "";
    const subjectVal = eventSubjectInput ? eventSubjectInput.value.trim() : "";
    const linkVal = eventLinkInput ? eventLinkInput.value.trim() : "";

    if (!dateVal && !subjectVal) {
      eventPreview.innerHTML = "<em>Preview will appear here...</em>";
      return;
    }

    let parsedSubject = parseMarkdown(subjectVal);

    if (linkVal) {
      parsedSubject = `<a href="${linkVal}" target="_blank" rel="noopener">${parsedSubject}</a>`;
    }

    const formattedDate = dateVal ? `<strong>${parseMarkdown(dateVal)}</strong>: ` : "";
    eventPreview.innerHTML = `${formattedDate}${parsedSubject}`;
  }

  if (eventDateInput && eventSubjectInput) {
    eventDateInput.addEventListener("input", updateEventPreview);
    eventSubjectInput.addEventListener("input", updateEventPreview);
    if (eventLinkInput) {
      eventLinkInput.addEventListener("input", updateEventPreview);
    }
  }

  const nlWriteupInput = document.getElementById("nl-writeup");
  const nlPreview = document.getElementById("nl-preview");
  if (nlWriteupInput && nlPreview) {
    nlWriteupInput.addEventListener("input", (e) => {
      const paragraphs = e.target.value
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (!paragraphs.length) {
        nlPreview.innerHTML = "<em>Preview will appear here...</em>";
        return;
      }
      nlPreview.innerHTML = paragraphs
        .map((p) => `<p>${parseMarkdown(p)}</p>`)
        .join("");
    });
  }

  const noticeInput = document.getElementById("notice-text");
  const noticePreview = document.getElementById("notice-preview");
  if (noticeInput && noticePreview) {
    noticeInput.addEventListener("input", (e) => {
      const rendered = parseMarkdown(e.target.value);
      noticePreview.innerHTML =
        rendered || "<em>Preview will appear here...</em>";
    });
  }

  function getAuthToken() {
    const t = tokenInput ? tokenInput.value.trim() : "";
    if (!t) throw new Error("Please enter your GitHub Access Token above.");
    return t;
  }

  async function fetchFile(path) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (res.status === 404) return { sha: null, data: null };
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Could not access repository path: ${path}`);
    }
    const json = await res.json();
    const content = decodeURIComponent(escape(atob(json.content)));
    return { sha: json.sha, data: JSON.parse(content) };
  }

  async function commitFile(path, contentStr, sha, message) {
    const b64 = btoa(unescape(encodeURIComponent(contentStr)));
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          content: b64,
          sha: sha || undefined,
          branch: BRANCH,
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Commit failed. Check token permissions.");
    }
  }

  function setupFormValidation(formId, btnId) {
    const form = document.getElementById(formId);
    const btn = document.getElementById(btnId);
    if (!form || !btn) return;

    const checkFormValidity = () => {
      const hasToken = tokenInput && tokenInput.value.trim().length > 0;
      const requiredInputs = Array.from(form.querySelectorAll("[required]"));
      const allRequiredFilled = requiredInputs.every((input) => input.value.trim().length > 0);

      btn.disabled = !(hasToken && allRequiredFilled);
    };

    form.addEventListener("input", checkFormValidity);
    form.addEventListener("change", checkFormValidity);
    checkFormValidity();
  }

  function updateAllFormsValidation() {
    setupFormValidation("form-event", "btn-event");
    setupFormValidation("form-newsletter", "btn-newsletter");
    setupFormValidation("form-notice", "btn-notice");
  }

  updateAllFormsValidation();

  const formEvent = document.getElementById("form-event");
  if (formEvent) {
    formEvent.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btn-event");

      try {
        btn.textContent = "Committing to Git...";
        btn.disabled = true;
        window.setGlobalStatus("Committing event to repository...");

        const { sha, data } = await fetchFile(EVENTS_FILE_PATH);
        const semesters = Array.isArray(data) ? data : [];

        const targetSem = document.getElementById("event-sem").value.trim();
        const dateVal = document.getElementById("event-date").value.trim();
        const textVal = document.getElementById("event-subject").value.trim();
        const linkVal = document.getElementById("event-link").value.trim();

        const newEntry = { date: dateVal, text: textVal };
        if (linkVal) newEntry.link = linkVal;

        let semGroup = semesters.find(
          (s) => s.semester.toLowerCase() === targetSem.toLowerCase(),
        );

        if (semGroup) {
          semGroup.events.unshift(newEntry);
        } else {
          semesters.unshift({
            semester: targetSem,
            events: [newEntry],
          });
        }

        await commitFile(
          EVENTS_FILE_PATH,
          JSON.stringify(semesters, null, 2),
          sha,
          `Add event under ${targetSem}: "${textVal.slice(0, 40)}..."`,
        );

        window.setGlobalStatus(`Event committed under ${targetSem}.`);
        formEvent.reset();
        if (eventPreview) eventPreview.innerHTML = "<em>Preview will appear here...</em>";
      } catch (err) {
        window.setGlobalStatus(err.message, true);
      } finally {
        btn.textContent = "Commit Event to Git";
        setupFormValidation("form-event", "btn-event");
      }
    });
  }

  const formNewsletter = document.getElementById("form-newsletter");
  if (formNewsletter) {
    formNewsletter.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btn-newsletter");

      try {
        btn.textContent = "Committing to Git...";
        btn.disabled = true;
        window.setGlobalStatus("Publishing newsletter issue...");

        const coverUrl = document.getElementById("nl-cover").value.trim();
        const { sha, data } = await fetchFile(NEWSLETTERS_FILE_PATH);
        const issues = Array.isArray(data) ? data : [];

        const rawWriteup = document.getElementById("nl-writeup").value.trim();
        const writeupParagraphs = rawWriteup
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        const issueTitle = document.getElementById("nl-title").value.trim();

        issues.unshift({
          id: issues.length ? Math.max(...issues.map((i) => i.id || 0)) + 1 : 1,
          title: issueTitle,
          cover_image: coverUrl,
          pdf_link: document.getElementById("nl-pdf").value.trim(),
          writeup: writeupParagraphs,
          feedback_link: document.getElementById("nl-feedback").value.trim(),
          submit_link: document.getElementById("nl-submit").value.trim(),
        });

        await commitFile(
          NEWSLETTERS_FILE_PATH,
          JSON.stringify(issues, null, 2),
          sha,
          `Publish newsletter issue: ${issueTitle}`,
        );

        window.setGlobalStatus(`Newsletter "${issueTitle}" published.`);
        formNewsletter.reset();
        if (nlPreview) nlPreview.innerHTML = "<em>Preview will appear here...</em>";
      } catch (err) {
        window.setGlobalStatus(err.message, true);
      } finally {
        btn.textContent = "Publish Edition";
        setupFormValidation("form-newsletter", "btn-newsletter");
      }
    });
  }

  const formNotice = document.getElementById("form-notice");
  if (formNotice) {
    formNotice.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btn-notice");
      try {
        btn.textContent = "Pushing Notice...";
        btn.disabled = true;
        window.setGlobalStatus("Pushing notice to repository...");

        const { sha, data } = await fetchFile(NOTICES_FILE_PATH);
        const notices = Array.isArray(data) ? data : [];

        notices.unshift({
          text: document.getElementById("notice-text").value.trim(),
        });

        await commitFile(
          NOTICES_FILE_PATH,
          JSON.stringify(notices, null, 2),
          sha,
          "Add notice via admin dashboard",
        );
        window.setGlobalStatus("Notice committed.");
        formNotice.reset();
        if (noticePreview) noticePreview.innerHTML = "<em>Preview will appear here...</em>";
      } catch (err) {
        window.setGlobalStatus(err.message, true);
      } finally {
        btn.textContent = "Push Notice";
        setupFormValidation("form-notice", "btn-notice");
      }
    });
  }
});
