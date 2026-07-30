async function loadComponent(elementId, filePath, callback) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}`);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;

    if (callback) callback();
  } catch (error) {
    console.error("Error loading component:", error);
  }
}

function setupMobileNav() {
  const toggleBtn = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", isOpen);
    });
  }
}

loadComponent("site-header", "./assets/template/nav.html", setupMobileNav);
loadComponent('site-footer', './assets/template/footer.html');