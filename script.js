(() => {
  const EVENT_START = new Date("2026-11-21T15:00:00+09:00");
  const EVENT_END = new Date("2026-11-21T19:00:00+09:00");

  /* toast */
  const toastEl = document.getElementById("toast");
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
  };

  /* calendar (2026년 11월, 1일 = 일요일) */
  const cal = document.getElementById("calendar");
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  const first = new Date(2026, 10, 1).getDay();
  let html = dows.map((d) => `<span class="dow">${d}</span>`).join("");
  html += "<span></span>".repeat(first);
  for (let d = 1; d <= 30; d++) {
    const cls = ["day"];
    if ((first + d - 1) % 7 === 0) cls.push("sun");
    if (d === 21) cls.push("is-event");
    html += `<span class="${cls.join(" ")}">${d}</span>`;
  }
  cal.innerHTML = html;

  /* countdown */
  const cd = document.getElementById("countdown");
  const msg = document.getElementById("countdownMsg");
  const cells = Object.fromEntries([...cd.querySelectorAll("b")].map((b) => [b.dataset.k, b]));
  const tick = () => {
    const now = Date.now();
    let diff = EVENT_START - now;
    if (now >= EVENT_END) {
      cd.hidden = true;
      msg.innerHTML = "함께해 주셔서 감사합니다";
      return;
    }
    if (diff <= 0) {
      cd.hidden = true;
      msg.innerHTML = "지금, <em>울림</em>이 시작되었습니다";
      return;
    }
    const s = Math.floor(diff / 1000);
    cells.d.textContent = Math.floor(s / 86400);
    cells.h.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
    cells.m.textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    cells.s.textContent = String(s % 60).padStart(2, "0");
    msg.innerHTML = `울림까지 <em>${Math.ceil(diff / 86400000)}일</em> 남았습니다`;
  };
  tick();
  setInterval(tick, 1000);

  /* add to calendar (.ics) */
  document.getElementById("addCal").addEventListener("click", () => {
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KMUCS ECHO//Invitation//KO",
      "BEGIN:VEVENT",
      "UID:kmucs-2026-ullim@echo",
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(EVENT_START)}`,
      `DTEND:${fmt(EVENT_END)}`,
      "SUMMARY:슬랑제 : 울림",
      "LOCATION:국민대학교 체육관 (서울특별시 성북구 정릉로 77)",
      "DESCRIPTION:국민대학교 소프트웨어융합대학 슬랑제 : 울림",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "ullim-2026.ics" });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* copy */
  const copy = async (text, done) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = Object.assign(document.createElement("textarea"), { value: text });
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    toast(done);
  };
  document.querySelectorAll("[data-copy]").forEach((el) =>
    el.addEventListener("click", () => copy(el.dataset.copy, "주소가 복사되었습니다"))
  );

  /* share */
  document.getElementById("share").addEventListener("click", async () => {
    const data = { title: "슬랑제 : 울림 — 초대장", text: "2026.11.21 SAT 15:00 · 국민대학교 체육관", url: location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* 사용자가 취소 */ }
    } else {
      copy(location.href, "링크가 복사되었습니다");
    }
  });

  /* scroll reveal */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
