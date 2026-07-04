/**
 * Google Apps Script — Серверная часть рейтинга клипов.
 * Таблица должна иметь лист "Ratings" с колонками:
 *   A: clip_id
 *   B: total_score
 *   C: votes_count
 *
 * Деплоить как Web App: Execute as Me, Anyone has access.
 */

const SHEET_NAME = 'Ratings';

/**
 * Получить или создать лист с рейтингами.
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['clip_id', 'total_score', 'votes_count']);
  }
  return sheet;
}

/**
 * Найти строку по clip_id. Возвращает индекс строки (1-based) или -1.
 */
function findRow(sheet, clipId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(clipId)) {
      return i + 1; // 1-based row index
    }
  }
  return -1;
}

/**
 * GET-запросы: action=get (один клип) или action=get_all (все клипы).
 */
function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();

  if (action === 'get') {
    return handleGet(e.parameter.clip_id);
  }

  if (action === 'get_all') {
    return handleGetAll();
  }

  return jsonResponse({ error: 'Unknown action. Use ?action=get&clip_id=... or ?action=get_all' });
}

/**
 * POST-запросы: action=vote.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || '').toLowerCase();

    if (action === 'vote') {
      return handleVote(body.clip_id, Number(body.score));
    }

    return jsonResponse({ error: 'Unknown action. Use { action: "vote", clip_id: "...", score: N }' });
  } catch (err) {
    return jsonResponse({ error: 'Invalid request body: ' + err.message });
  }
}

/**
 * Получить рейтинг одного клипа.
 */
function handleGet(clipId) {
  if (!clipId) {
    return jsonResponse({ error: 'clip_id is required' });
  }

  const sheet = getSheet();
  const row = findRow(sheet, clipId);

  if (row === -1) {
    return jsonResponse({
      clip_id: clipId,
      total_score: 0,
      votes_count: 0,
      average: 0
    });
  }

  const totalScore = Number(sheet.getRange(row, 2).getValue());
  const votesCount = Number(sheet.getRange(row, 3).getValue());
  const average = votesCount > 0 ? Math.round((totalScore / votesCount) * 100) / 100 : 0;

  return jsonResponse({
    clip_id: clipId,
    total_score: totalScore,
    votes_count: votesCount,
    average: average
  });
}

/**
 * Получить рейтинги всех оценённых клипов.
 */
function handleGetAll() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const clipId = String(data[i][0]);
    const totalScore = Number(data[i][1]);
    const votesCount = Number(data[i][2]);

    if (clipId && votesCount > 0) {
      results.push({
        clip_id: clipId,
        total_score: totalScore,
        votes_count: votesCount,
        average: Math.round((totalScore / votesCount) * 100) / 100
      });
    }
  }

  return jsonResponse(results);
}

/**
 * Записать голос за клип.
 */
function handleVote(clipId, score) {
  if (!clipId) {
    return jsonResponse({ error: 'clip_id is required' });
  }
  if (!score || score < 1 || score > 5) {
    return jsonResponse({ error: 'score must be between 1 and 5' });
  }

  const sheet = getSheet();
  const row = findRow(sheet, clipId);

  let totalScore, votesCount;

  if (row === -1) {
    // Новый клип — добавляем строку
    sheet.appendRow([clipId, score, 1]);
    totalScore = score;
    votesCount = 1;
  } else {
    // Существующий клип — обновляем
    totalScore = Number(sheet.getRange(row, 2).getValue()) + score;
    votesCount = Number(sheet.getRange(row, 3).getValue()) + 1;
    sheet.getRange(row, 2).setValue(totalScore);
    sheet.getRange(row, 3).setValue(votesCount);
  }

  const average = Math.round((totalScore / votesCount) * 100) / 100;

  return jsonResponse({
    clip_id: clipId,
    total_score: totalScore,
    votes_count: votesCount,
    average: average
  });
}

/**
 * Вспомогательная: сформировать JSON-ответ с CORS-заголовками.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
