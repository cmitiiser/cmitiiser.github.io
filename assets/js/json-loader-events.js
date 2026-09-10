document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("events-target");

  fetch("/data/events.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then((semesters) => {
      if (!semesters || !semesters.length) {
        container.innerHTML = "<p>No events recorded yet.</p>";
        return;
      }

      container.innerHTML =
        semesters
          .map((sem) => {
            const itemsHtml = sem.events
              .map((ev) => {
                const datePart = ev.date ? `<b>${ev.date}: </b>` : "";
                const mainText = `${datePart}${ev.text}`;

                let htmlContent = "";
                if (ev.link) {
                  htmlContent = `<a href="${ev.link}"><p>${mainText}</p></a>`;
                } else {
                  htmlContent = `<p>${mainText}</p>`;
                }

                if (ev.sublist && ev.sublist.length) {
                  const subItems = ev.sublist
                    .map((sub) => `<li>${sub}</li>`)
                    .join("");
                  htmlContent += `<ul style="list-style-type: disc; margin-left: 50px">${subItems}</ul>`;
                }

                return htmlContent;
              })
              .join("");

            return `
                <div class="sem-container pt-5">
                  <h3 class="sem-title">${sem.semester}</h3>
                  ${itemsHtml}
                </div>
              `;
          })
          .join("") + "<br /><br />";
    })
    .catch((err) => {
      console.error("Failed to load events:", err);
      container.innerHTML =
        '<p style="color: #c00;">Failed to load events archive. Please try again later.</p>';
    });
});
