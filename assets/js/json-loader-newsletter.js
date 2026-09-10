document.addEventListener('DOMContentLoaded', () => {
          const target = document.getElementById('newsletter-target');
          const DEFAULT_FEEDBACK = "https://docs.google.com/forms/d/e/1FAIpQLScfTczX2dpr6Z6i_kHQnT5MM6Li7pP-zcsG_1kB4YExK-szGA/viewform";
          const DEFAULT_SUBMIT = "mailto:mathsclub@iisertvm.ac.in";

          function renderMarkdown(str) {
            if (!str) return '';
            return str
              .replace(/<sup>(.*?)<\/sup>/gi, '___SUP_O___$1___SUP_C___')
              .replace(/<sub>(.*?)<\/sub>/gi, '___SUB_O___$1___SUB_C___')
              .replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/___SUP_O___(.*?)___SUP_C___/g, '<sup>$1</sup>')
              .replace(/___SUB_O___(.*?)___SUB_C___/g, '<sub>$1</sub>')
              .replace(/\^\{(.*?)\}/g, '<sup>$1</sup>')
              .replace(/\^([^\s^]+)\^/g, '<sup>$1</sup>')
              .replace(/_\{(.*?)\}/g, '<sub>$1</sub>')
              .replace(/~([^\s~]+)~/g, '<sub>$1</sub>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
          }

          fetch('/data/newsletters.json')
            .then(res => {
              if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
              return res.json();
            })
            .then(issues => {
              if (!issues || !issues.length) {
                target.innerHTML = '<p style="text-align:center;">No issues published yet.</p>';
                return;
              }

              target.innerHTML = issues.map((issue, index) => {
                const paragraphs = Array.isArray(issue.writeup)
                  ? issue.writeup.map(p => `<p>${renderMarkdown(p)}</p>`).join('')
                  : `<p>${renderMarkdown(issue.writeup)}</p>`;

                const feedbackUrl = (issue.feedback_link && issue.feedback_link.trim() !== '')
                  ? issue.feedback_link
                  : DEFAULT_FEEDBACK;

                const submitUrl = (issue.submit_link && issue.submit_link.trim() !== '')
                  ? issue.submit_link
                  : DEFAULT_SUBMIT;

                const divider = index < issues.length - 1 ? '<hr class="issue-divider" />' : '';

                return `
                  <article class="issue-card">
                    <div class="issue-cover">
                      <a href="${issue.pdf_link}" target="_blank" rel="noopener">
                        <img src="${issue.cover_image}" alt="${issue.title} Cover" loading="lazy" />
                      </a>
                    </div>
                    <div class="issue-content">
                      ${paragraphs}

                      <div class="issue-actions">
                        <a href="${feedbackUrl}" target="_blank" rel="noopener" class="btn-donut">
                          Give Feedback
                        </a>
                        <a href="${submitUrl}" class="btn-donut">
                          Submit Content
                        </a>
                      </div>

                      <div class="issue-meta">
                        <h3>${issue.title}</h3>
                        <a href="${issue.pdf_link}" target="_blank" rel="noopener" class="read-link">
                          Read this issue &rarr;
                        </a>
                      </div>
                    </div>
                  </article>
                  ${divider}
                `;
              }).join('');
            })
            .catch(err => {
              console.error(err);
              target.innerHTML = '<p style="color: #c00; text-align:center;">Failed to load newsletter archive.</p>';
            });
        });