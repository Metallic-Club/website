export const reportReasons = ['Inappropriate content', 'Harassment or abuse', 'Spam or scam', 'Something else'];
const reportKinds = new Set(['game', 'profile', 'group', 'item']);
export const reportLimit = 50;

export function normalizeReports(reports) {
  if (!Array.isArray(reports)) return [];
  const seen = new Set();
  const result = [];
  for (const report of reports) {
    if (!report || !reportKinds.has(report.kind) || typeof report.id !== 'string' ||
      !/^[\w-]{1,80}$/.test(report.id) || !reportReasons.includes(report.reason)) continue;
    const key = report.kind + ':' + report.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({kind: report.kind, id: report.id, reason: report.reason});
    if (result.length === reportLimit) break;
  }
  return result;
}
