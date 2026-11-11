/**
 * 주차 신청 → 구글 스프레드시트 저장용 Apps Script
 *
 * 설치 방법
 * 1. 주차 신청 스프레드시트 열기 → 확장 프로그램 → Apps Script
 * 2. 기본 코드를 지우고 이 파일 내용을 붙여넣은 뒤 저장
 * 3. 배포 → 새 배포 → 유형: 웹 앱
 *    - 다음 사용자 인증 정보로 실행: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 * 4. 권한 승인 후 나오는 웹 앱 URL(…/exec)을 script.js 의 PARKING_ENDPOINT 에 붙여넣기
 *
 * 코드를 수정한 경우: 배포 → 배포 관리 → 편집(연필) → 버전 "새 버전" → 배포
 * (그래야 URL이 바뀌지 않고 수정 내용이 반영됩니다)
 */

const SHEET_NAME = "주차신청";
const HEADERS = ["신청시각", "이름", "전화번호", "학번"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const name = String(data.name || "").trim().slice(0, 20);
    const phone = String(data.phone || "").trim();
    const studentId = String(data.studentId || "").trim();

    if (!name) return json({ ok: false, error: "name" });
    if (!/^01\d-\d{3,4}-\d{4}$/.test(phone)) return json({ ok: false, error: "phone" });
    if (!/^\d{2}$/.test(studentId)) return json({ ok: false, error: "studentId" });

    lock.waitLock(10000);
    const sheet = getSheet_();
    // 앞에 ' 를 붙여 전화번호 앞자리 0, 학번이 숫자로 바뀌지 않게 텍스트로 저장
    sheet.appendRow([new Date(), safe_(name), "'" + phone, "'" + studentId]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: "server" });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

// =, +, -, @ 로 시작하는 값이 수식으로 실행되지 않도록 방지
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
