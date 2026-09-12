document.addEventListener("DOMContentLoaded", () => {
  const MEDIA_REPO_OWNER = "cmitiiser";
  const MEDIA_REPO_NAME = "mailmedia";
  const MEDIA_BRANCH = "main";

  const IMAGE_EXTENSIONS = [
    "jpg", "jpeg", "png", "webp", "gif", "svg", "avif", "ico"
  ];

  const dropZone = document.getElementById("media-dropzone");
  const fileInput = document.getElementById("media-file-input");
  const reviewBtn = document.getElementById("btn-review-media");
  const countBadge = document.getElementById("media-count-badge");
  const statusBtn = document.getElementById("btn-media-status");
  const statusText = document.getElementById("media-status-text");
  const historyBadge = document.getElementById("media-history-badge");

  // Review Modal Elements
  const reviewModal = document.getElementById("media-modal");
  const reviewCloseBtn = document.getElementById("btn-modal-close");
  const reviewCancelBtn = document.getElementById("btn-modal-cancel");
  const reviewCommitBtn = document.getElementById("btn-modal-commit");
  const reviewFilesList = document.getElementById("modal-files-list");

  // Status Modal Elements
  const statusModal = document.getElementById("status-modal");
  const statusCloseBtn = document.getElementById("btn-status-modal-close");
  const statusDoneBtn = document.getElementById("btn-status-modal-done");
  const statusModalList = document.getElementById("status-modal-list");

  let stagedFiles = [];
  let uploadHistory = []; // Tracks { id, name, file, path, status, error, rawUrl }

  function getAuthToken() {
    const tokenInput = document.getElementById("gh-token");
    return tokenInput ? tokenInput.value.trim() : localStorage.getItem("cmit_pat") || "";
  }

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

  function updateStatusButtonState() {
    const token = getAuthToken();
    const stagedCount = stagedFiles.length;
    const historyCount = uploadHistory.length;

    if (countBadge) countBadge.textContent = stagedCount;
    if (historyBadge) historyBadge.textContent = historyCount;

    // Determine left Review & Commit state
    reviewBtn.disabled = !(stagedCount > 0 && token);

    // Determine right Status Button appearance
    const isUploading = uploadHistory.some((h) => h.status === "uploading");
    const hasError = uploadHistory.some((h) => h.status === "error");

    if (isUploading) {
      statusBtn.className = "cmit-status-btn uploading";
      statusText.textContent = "Committing...";
    } else if (hasError) {
      statusBtn.className = "cmit-status-btn error";
      statusText.textContent = "Dispatches (Errors)";
    } else if (historyCount > 0) {
      statusBtn.className = "cmit-status-btn success";
      statusText.textContent = "Dispatches";
    } else {
      statusBtn.className = "cmit-status-btn idle";
      statusText.textContent = stagedCount > 0 ? `${stagedCount} Staged` : "Dispatch History";
    }
  }

  // Add files to stage
  function stageFiles(files) {
    if (!files || !files.length) return;
    for (const file of files) {
      if (!stagedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        stagedFiles.push(file);
      }
    }
    updateStatusButtonState();
  }

  // Browse file trigger
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        stageFiles(Array.from(e.target.files));
        fileInput.value = "";
      }
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("is-hovered");
    });

    ["dragleave", "dragend"].forEach((type) => {
      dropZone.addEventListener(type, () => dropZone.classList.remove("is-hovered"));
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("is-hovered");
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        stageFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  const tokenInput = document.getElementById("gh-token");
  if (tokenInput) {
    tokenInput.addEventListener("input", updateStatusButtonState);
  }

  // Render Review Modal with Thumbnails
  function renderReviewQueue() {
    reviewFilesList.innerHTML = "";

    if (!stagedFiles.length) {
      reviewFilesList.innerHTML = '<p class="cmit-empty-notice">No files staged in queue.</p>';
      reviewCommitBtn.disabled = true;
      return;
    }

    reviewCommitBtn.disabled = false;

    stagedFiles.forEach((file, index) => {
      const path = resolvePathForFile(file.name);
      const ext = file.name.split(".").pop().toLowerCase();
      const isImg = IMAGE_EXTENSIONS.includes(ext);

      const row = document.createElement("div");
      row.className = "cmit-modal-file-item";

      const thumbHtml = isImg
        ? `<div class="cmit-modal-thumb-wrap"><img src="${URL.createObjectURL(file)}" alt="Preview" class="cmit-modal-thumb" /></div>`
        : `<div class="cmit-modal-thumb-wrap cmit-modal-thumb-doc"><span>${ext.toUpperCase()}</span></div>`;

      row.innerHTML = `
        <div class="cmit-modal-file-left">
          ${thumbHtml}
          <div class="cmit-modal-file-info">
            <strong class="cmit-modal-filename" title="${file.name}">${file.name}</strong>
            <span class="cmit-modal-filepath">&rarr; /${path}</span>
          </div>
        </div>
        <button type="button" class="cmit-modal-del-btn" data-index="${index}" title="Remove file">&times;</button>
      `;

      reviewFilesList.appendChild(row);
    });

    reviewFilesList.querySelectorAll(".cmit-modal-del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        stagedFiles.splice(idx, 1);
        renderReviewQueue();
        updateStatusButtonState();
      });
    });
  }

  // Render Status & History Modal
  function renderStatusModal() {
    statusModalList.innerHTML = "";

    if (!uploadHistory.length) {
      statusModalList.innerHTML = '<p class="cmit-empty-notice">No commits dispatched yet in this session.</p>';
      return;
    }

    uploadHistory.forEach((item) => {
      const ext = item.name.split(".").pop().toLowerCase();
      const isImg = IMAGE_EXTENSIONS.includes(ext);
      const card = document.createElement("div");
      card.className = `cmit-status-card ${item.status}`;

      const thumbHtml = isImg && item.file
        ? `<div class="cmit-modal-thumb-wrap"><img src="${URL.createObjectURL(item.file)}" alt="Preview" class="cmit-modal-thumb" /></div>`
        : `<div class="cmit-modal-thumb-wrap cmit-modal-thumb-doc"><span>${ext.toUpperCase()}</span></div>`;

      let statusBadge = "";
      let actionArea = "";

      if (item.status === "uploading") {
        statusBadge = '<span class="cmit-tag uploading">Committing...</span>';
      } else if (item.status === "success") {
        statusBadge = '<span class="cmit-tag success">&check; Committed</span>';
        actionArea = `
          <div class="cmit-link-output">
            <input type="text" class="cmit-link-input" value="${item.rawUrl}" readonly />
            <button type="button" class="cmit-copy-btn">Copy Link</button>
          </div>
          <p class="cmit-delay-warning">&#9888; CDN propagation may take 2&ndash;5 min.</p>
        `;
      } else {
        statusBadge = '<span class="cmit-tag error">&cross; Failed</span>';
        actionArea = `<p class="cmit-error-msg">${item.error || "Failed to commit."}</p>`;
      }

      card.innerHTML = `
        <div class="cmit-modal-file-left">
          ${thumbHtml}
          <div class="cmit-modal-file-info">
            <div class="cmit-card-header">
              <strong class="cmit-modal-filename" title="${item.name}">${item.name}</strong>
              ${statusBadge}
            </div>
            <span class="cmit-modal-filepath">/${item.path}</span>
          </div>
        </div>
        ${actionArea}
      `;

      const copyBtn = card.querySelector(".cmit-copy-btn");
      const linkInput = card.querySelector(".cmit-link-input");
      if (copyBtn && linkInput) {
        copyBtn.addEventListener("click", () => {
          linkInput.select();
          navigator.clipboard.writeText(item.rawUrl);
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = "Copy Link"), 2000);
        });
      }

      statusModalList.appendChild(card);
    });
  }

  // Modal Open/Close Controls
  function openModal(modalEl, renderFn) {
    if (renderFn) renderFn();
    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("is-open");
    modalEl.setAttribute("aria-hidden", "true");
  }

  if (reviewBtn) reviewBtn.addEventListener("click", () => openModal(reviewModal, renderReviewQueue));
  if (reviewCloseBtn) reviewCloseBtn.addEventListener("click", () => closeModal(reviewModal));
  if (reviewCancelBtn) reviewCancelBtn.addEventListener("click", () => closeModal(reviewModal));

  if (statusBtn) statusBtn.addEventListener("click", () => openModal(statusModal, renderStatusModal));
  if (statusCloseBtn) statusCloseBtn.addEventListener("click", () => closeModal(statusModal));
  if (statusDoneBtn) statusDoneBtn.addEventListener("click", () => closeModal(statusModal));

  window.addEventListener("click", (e) => {
    if (e.target === reviewModal) closeModal(reviewModal);
    if (e.target === statusModal) closeModal(statusModal);
  });

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Commit Execution
  if (reviewCommitBtn) {
    reviewCommitBtn.addEventListener("click", async () => {
      const token = getAuthToken();
      if (!token) {
        alert("GitHub Token is missing. Enter it in the field above.");
        closeModal(reviewModal);
        return;
      }

      const queue = [...stagedFiles];
      stagedFiles = [];
      closeModal(reviewModal);

      // Pre-populate History records
      const newItems = queue.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        file: file,
        path: resolvePathForFile(file.name),
        status: "uploading",
        error: null,
        rawUrl: null,
      }));

      uploadHistory.unshift(...newItems);
      updateStatusButtonState();

      for (const item of newItems) {
        await commitItemToGit(item, token);
      }
    });
  }

  async function commitItemToGit(item, token) {
    try {
      const base64Content = await toBase64(item.file);

      // Check SHA for overwrite
      let sha = null;
      const getRes = await fetch(
        `https://api.github.com/repos/${MEDIA_REPO_OWNER}/${MEDIA_REPO_NAME}/contents/${item.path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      const putRes = await fetch(
        `https://api.github.com/repos/${MEDIA_REPO_OWNER}/${MEDIA_REPO_NAME}/contents/${item.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Upload media: ${item.path}`,
            content: base64Content,
            sha: sha || undefined,
            branch: MEDIA_BRANCH,
          }),
        }
      );

      if (!putRes.ok) {
        const errJson = await putRes.json();
        throw new Error(errJson.message || "Failed to commit file.");
      }

      item.status = "success";
      item.rawUrl = `https://raw.githubusercontent.com/${MEDIA_REPO_OWNER}/${MEDIA_REPO_NAME}/${MEDIA_BRANCH}/${item.path}`;
    } catch (err) {
      item.status = "error";
      item.error = err.message;
    } finally {
      updateStatusButtonState();
      // Auto-update modal if open
      if (statusModal.classList.contains("is-open")) {
        renderStatusModal();
      }
    }
  }
});
