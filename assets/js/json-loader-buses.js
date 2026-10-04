(async function () {
  const $ = (id) => document.getElementById(id);
  const state = { data: null, tab: 0, dest: "all", hidePast: true };

  // "06:20" -> minutes since midnight
  const mins = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  // "13:05" -> { t: "1:05", ap: "PM" }
  const fmt = (t) => {
    const [h, m] = t.split(":").map(Number);
    return {
      t: `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`,
      ap: h < 12 ? "AM" : "PM",
    };
  };
  const nowMins = () => {
    const d = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    return d.getHours() * 60 + d.getMinutes();
  };
  const name = (code) => (state.data.stops[code] || { name: code }).name;
  const duration = (b) => {
    if (!b.arr) return "";
    let d = mins(b.arr) - mins(b.dep);
    if (d < 0) d += 1440;
    return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d} min`;
  };
  const eta = (diff) =>
    diff <= 0
      ? "Leaving now"
      : diff < 60
        ? `in ${diff} min`
        : `in ${Math.floor(diff / 60)}h ${diff % 60}m`;

  function render() {
    const table = state.data.tables[state.tab];
    const now = nowMins();
    const all = [...table.buses].sort((a, b) => mins(a.dep) - mins(b.dep));

    // Destination chips (unique by display name)
    const dests = [...new Set(all.map((b) => name(b.to)))];
    if (state.dest !== "all" && !dests.includes(state.dest)) state.dest = "all";
    $("bus-chips").innerHTML = ["all", ...dests]
      .map(
        (d) =>
          `<button class="bus-chip ${d === state.dest ? "active" : ""}" data-dest="${d}">${d === "all" ? "All" : d}</button>`,
      )
      .join("");

    const filtered = all.filter(
      (b) => state.dest === "all" || name(b.to) === state.dest,
    );
    const next = filtered.find((b) => mins(b.dep) >= now);

    // Next-bus banner
    const banner = $("bus-next");
    if (next) {
      const f = fmt(next.dep);
      banner.hidden = false;
      banner.innerHTML = `
        <div>
          <div class="bus-next-label">Next bus</div>
          <div class="bus-next-main">${f.t} ${f.ap} · ${name(next.from)} → ${name(next.to)}</div>
        </div>
        <div class="bus-next-eta">${eta(mins(next.dep) - now)}</div>`;
    } else {
      banner.hidden = false;
      banner.innerHTML = `<div><div class="bus-next-label">Next bus</div><div class="bus-next-main">No more buses today</div></div>`;
    }

    // Rows
    const rows = filtered.filter((b) => !(state.hidePast && mins(b.dep) < now));
    $("bus-list").innerHTML = rows.length
      ? rows
          .map((b) => {
            const dep = fmt(b.dep);
            const arr = b.arr ? fmt(b.arr) : null;
            const direct = ["TVM"].includes(b.to) || ["TVM"].includes(b.from);
            return `
          <li class="bus-row ${b === next ? "is-next" : ""} ${mins(b.dep) < now ? "is-past" : ""}">
            <div class="bus-time">${dep.t}<small>${dep.ap}</small></div>
            <div class="bus-route">
              ${name(b.from)}<span class="arrow">→</span>${name(b.to)}
              ${direct ? '<span class="bus-badge direct">Trivandrum</span>' : ""}
              ${b.via ? `<span class="via">via ${b.via}</span>` : ""}
              ${b.note ? `<span class="via">${b.note}</span>` : ""}
            </div>
            <div class="bus-arrive">
              ${arr ? `<strong>${arr.t} ${arr.ap}</strong>${duration(b)}` : "Arrival n/a"}
            </div>
          </li>`;
          })
          .join("")
      : `<li class="bus-empty">No buses to show. Try "All" or untick "Hide departed".</li>`;
  }

  try {
    const res = await fetch("/data/buses.json", { cache: "no-cache" });
    state.data = await res.json();
  } catch (e) {
    $("bus-list").innerHTML =
      `<li class="bus-empty">Couldn't load bus timings.</li>`;
    return;
  }

  $("bus-tabs").innerHTML = state.data.tables
    .map(
      (t, i) =>
        `<button class="bus-tab ${i === 0 ? "active" : ""}" data-i="${i}" role="tab">${t.title}</button>`,
    )
    .join("");
  if (state.data.updated)
    $("bus-updated").textContent =
      `Last updated: ${state.data.updated} · arrival times are approximate`;

  $("bus-tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".bus-tab");
    if (!b) return;
    state.tab = +b.dataset.i;
    state.dest = "all";
    document
      .querySelectorAll(".bus-tab")
      .forEach((x) => x.classList.toggle("active", x === b));
    render();
  });
  $("bus-chips").addEventListener("click", (e) => {
    const b = e.target.closest(".bus-chip");
    if (!b) return;
    state.dest = b.dataset.dest;
    render();
  });
  $("hide-past").addEventListener("change", (e) => {
    state.hidePast = e.target.checked;
    render();
  });

  render();
  setInterval(render, 60000);
})();
