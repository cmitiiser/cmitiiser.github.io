document.addEventListener("DOMContentLoaded", () => {
  const MEDIA_REPO_OWNER = "cmitiiser";
  const MEDIA_REPO_NAME = "mailmedia";
  const MEDIA_BRANCH = "main";

  const IMAGE_EXTENSIONS = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "svg",
    "avif",
    "ico",
  ];

  const dropZone = document.getElementById("media-dropzone");
  const fileInput = document.getElementById("media-file-input");
  const commitBtn = document.getElementById("btn-commit-media");
  const statusBtn = document.getElementById("btn-media-status");
  const statusText = document.getElementById("media-status-text");
  const stagedInfo = document.getElementById("media-staged-info");
  const stagedFileName = document.getElementById("staged-file-name");
  const stagedFilePath = document.getElementById("staged-file-path");
  const linkContainer = document.getElementById("media-link-container");
  const rawLinkInput = document.getElementById("media-raw-link-input");
  const copyBtn = document.getElementById("btn-copy-media-link");

  let selectedFile = null;
  let resolvedPath = "";

  function getAuthToken() {
    const tokenInput = document.getElementById("gh-token");
    const t = tokenInput
      ? tokenInput.value.trim()
      : localStorage.getItem("cmit_pat") || "";
    if (!t) throw new Error("Please enter your GitHub Access Token above.");
    return t;
  }

  // Generates YY-mmm string, e.g. 26-oct or 27-jan
  function getYearMonthFolder() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mmm = now.toLocaleString("en-US", { month: "short" }).toLowerCase();
    return `${yy}-${mmm}`;
  }

  function resolvePathForFile(fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const isImage = IMAGE_EXTENSIONS.includes(ext);
    const categoryFolder = isImage ? "img" : "doc";
    const dateFolder = getYearMonthFolder();
    const sanitizedName = fileName.replace(/\s+/g, "-");
    return `${categoryFolder}/${dateFolder}/${sanitizedName}`;
  }

  function setStatus(state, message, url = null) {
    statusBtn.className = `cmit-status-btn ${state}`;
    statusText.textContent = message;

    if (url) {
      statusBtn.href = url;
      statusBtn.style.pointerEvents = "auto";
    } else {
      statusBtn.removeAttribute("href");
      statusBtn.style.pointerEvents = "none";
    }
  }

  function checkMediaValidity() {
    const hasToken =
      (tokenInput ? tokenInput.value.trim().length > 0 : false) ||
      (localStorage.getItem("cmit_pat") || "").length > 0;
    commitBtn.disabled = !(hasToken && selectedFile !== null);
  }

  function stageFile(file) {
    if (!file) return;
    selectedFile = file;
    resolvedPath = resolvePathForFile(file.name);

    if (tokenInput) {
      tokenInput.addEventListener("input", checkMediaValidity);
    }

    stagedFileName.textContent = file.name;
    stagedFilePath.textContent = `Destination: ${resolvedPath}`;
    stagedInfo.style.display = "block";
    linkContainer.style.display = "none";

    commitBtn.disabled = false;
    commitBtn.textContent = "Commit Media to Git";

    setStatus("ready", `Ready: ${file.name}`);
  }

  // Trigger file browser on click
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        stageFile(e.target.files[0]);
      }
    });

    // Drag-over styling
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("is-hovered");
    });

    ["dragleave", "dragend"].forEach((type) => {
      dropZone.addEventListener(type, () => {
        dropZone.classList.remove("is-hovered");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("is-hovered");
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        stageFile(e.dataTransfer.files[0]);
      }
    });
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Commit action
  if (commitBtn) {
    commitBtn.addEventListener("click", async () => {
      if (!selectedFile) return;

      try {
        const token = getAuthToken();
        commitBtn.disabled = true;
        commitBtn.textContent = "Committing File...";
        setStatus("uploading", "Committing to mailmedia...");

        const b64 = await toBase64(selectedFile);

        // Check if file exists to retrieve SHA for overwriting
        let sha = null;
        const checkRes = await fetch(
          `https://api.github.com/repos/${MEDIA_REPO_OWNER}/${MEDIA_REPO_NAME}/contents/${resolvedPath}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );

        if (checkRes.ok) {
          const fileData = await checkRes.json();
          sha = fileData.sha;
        }

        // Commit via GitHub REST API
        const commitRes = await fetch(
          `https://api.github.com/repos/${MEDIA_REPO_OWNER}/${MEDIA_REPO_NAME}/contents/${resolvedPath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Upload media asset: ${resolvedPath}`,
              content: b64,
              sha: sha || undefined,
              branch: MEDIA_BRANCH,
            }),
          },
        );

        if (!commitRes.ok) {
          const errData = await commitRes.json();
          throw new Error(errData.message || "Failed to commit media.");
        }

        // Pure raw GitHub file link
        const rawUrl = `https://raw.githubusercontent.com/${MEDIA_REPO_OWNER}/${MEDIA_REPO_NAME}/${MEDIA_BRANCH}/${resolvedPath}`;

        rawLinkInput.value = rawUrl;
        linkContainer.style.display = "flex";

        setStatus("success", "View Raw File &rarr;", rawUrl);
        commitBtn.textContent = "Committed!";

        if (typeof notify === "function") {
          notify(`Asset successfully committed to mailmedia/${resolvedPath}!`);
        }
      } catch (err) {
        commitBtn.disabled = false;
        commitBtn.textContent = "Retry Commit";
        setStatus("error", "Failed to Upload");
        alert(err.message);
      }
    });
  }

  // Copy helper
  if (copyBtn && rawLinkInput) {
    copyBtn.addEventListener("click", () => {
      rawLinkInput.select();
      navigator.clipboard.writeText(rawLinkInput.value);
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Link";
      }, 2000);
    });
  }
});
