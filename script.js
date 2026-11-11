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

  /* parking form → Google Sheets (Apps Script 웹앱) */
  // Apps Script 배포 후 받은 웹앱 URL(…/exec)을 붙여넣으세요.
  const PARKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbzS3rGSmFsRmK959BBdWVBOqX6F4NKOYPNkR04HuFtYmfchg_Pgypnw-PDx2iBwS9S6zQ/exec";

  const modal = document.getElementById("parkingModal");
  const form = document.getElementById("parkingForm");
  const errEl = document.getElementById("parkingError");
  const submitBtn = form.querySelector('[type="submit"]');

  const openModal = () => {
    errEl.textContent = "";
    modal.showModal();
  };
  const closeModal = () => modal.close();

  document.getElementById("parkingOpen").addEventListener("click", openModal);
  modal.querySelector("[data-close]").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // 전화번호 자동 하이픈
  form.phone.addEventListener("input", () => {
    const d = form.phone.value.replace(/\D/g, "").slice(0, 11);
    form.phone.value = d.length < 4 ? d
      : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}`
      : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
  });
  form.studentId.addEventListener("input", () => {
    form.studentId.value = form.studentId.value.replace(/\D/g, "");
  });
  form.querySelectorAll("input").forEach((el) =>
    el.addEventListener("input", () => el.classList.remove("invalid"))
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const studentId = form.studentId.value.trim();

    const fail = (el, text) => {
      if (el) { el.classList.add("invalid"); el.focus(); }
      errEl.textContent = text;
    };
    if (!name) return fail(form.name, "이름을 입력해 주세요.");
    if (!/^01\d-\d{3,4}-\d{4}$/.test(phone)) return fail(form.phone, "전화번호를 정확히 입력해 주세요.");
    if (!/^\d{2}$/.test(studentId)) return fail(form.studentId, "학번을 두 자리로 입력해 주세요. (예: 25)");
    if (!form.agree.checked) return fail(null, "개인정보 수집에 동의해 주세요.");
    if (form.website.value) return closeModal(); // 봇

    if (!PARKING_ENDPOINT) return fail(null, "신청 접수 준비 중입니다. 잠시 후 다시 시도해 주세요.");

    errEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "전송 중…";
    try {
      // text/plain 으로 보내야 CORS preflight 없이 Apps Script로 전달됩니다.
      const res = await fetch(PARKING_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ name, phone, studentId }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "failed");
      form.reset();
      closeModal();
      toast("주차 신청이 완료되었습니다");
    } catch {
      fail(null, "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "신청하기";
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
