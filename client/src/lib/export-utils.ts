import { Application, ApplicationAnalytics, SkillAnalytics } from './types';

/**
 * Formats a single field value for RFC 4180 compliant CSV output.
 * Handles null/undefined, quotes, commas, newlines, and unicode strings.
 */
export function formatCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  const str = String(val);
  // If field contains comma, double quote, or newlines, quote the entire field and escape double quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds a single CSV row from an array of values.
 */
export function buildCsvRow(fields: unknown[]): string {
  return fields.map(formatCsvField).join(',');
}

/**
 * Triggers a browser download of a CSV file with UTF-8 BOM for full Excel compatibility.
 */
export function downloadCsv(filename: string, csvContent: string): boolean {
  if (typeof window === 'undefined') return false;

  // \uFEFF is the UTF-8 Byte Order Mark (BOM), ensuring Excel renders UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  return true;
}

/**
 * Helper to get the current date in YYYY-MM-DD format.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface ExportResult {
  success: boolean;
  message?: string;
  rowCount?: number;
}

/**
 * Exports student applications to a downloadable CSV file.
 * Returns { success: false, message: 'No data available to export.' } if applications array is empty.
 */
export function exportApplicationsToCsv(applications: Application[]): ExportResult {
  if (!applications || !Array.isArray(applications) || applications.length === 0) {
    return {
      success: false,
      message: 'No data available to export.'
    };
  }

  const headers = [
    'Company',
    'Role / Position',
    'Status',
    'Date Applied',
    'Linked Skills',
    'Notes'
  ];

  const rows: string[] = [buildCsvRow(headers)];

  for (const app of applications) {
    const company = app.companyName || (app as unknown as { company_name?: string }).company_name || '';
    const role = app.roleTitle || (app as unknown as { role_title?: string }).role_title || '';
    const status = app.status || (app as unknown as { current_status_name?: string }).current_status_name || 'Applied';
    const dateApplied = app.dateApplied || (app as unknown as { date_applied?: string }).date_applied || '';
    const skills = Array.isArray(app.skills)
      ? app.skills.map(s => s.name).filter(Boolean).join('; ')
      : '';
    const notes = app.notes || '';

    rows.push(buildCsvRow([
      company,
      role,
      status,
      dateApplied,
      skills,
      notes
    ]));
  }

  const filename = `careertrack-applications-${getTodayDateString()}.csv`;
  downloadCsv(filename, rows.join('\r\n'));

  return {
    success: true,
    rowCount: applications.length
  };
}

export interface AdminAnalyticsExportData {
  appAnalytics?: ApplicationAnalytics[] | null;
  skillAnalytics?: SkillAnalytics[] | null;
  totalStudents?: number;
}

/**
 * Exports admin live analytics data to a downloadable CSV file.
 * Returns { success: false, message: 'No data available to export.' } if no analytics data exists.
 */
export function exportAdminAnalyticsToCsv(data: AdminAnalyticsExportData): ExportResult {
  const { appAnalytics, skillAnalytics, totalStudents = 0 } = data;

  const hasAppAnalytics = Array.isArray(appAnalytics) && appAnalytics.length > 0;
  const hasSkillAnalytics = Array.isArray(skillAnalytics) && skillAnalytics.length > 0;
  const hasData = hasAppAnalytics || hasSkillAnalytics || totalStudents > 0;

  if (!hasData) {
    return {
      success: false,
      message: 'No data available to export.'
    };
  }

  const headers = ['Category', 'Metric / Name', 'Count'];
  const rows: string[] = [buildCsvRow(headers)];

  // 1. Overview Section
  const totalApps = hasAppAnalytics
    ? appAnalytics.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
    : 0;

  rows.push(buildCsvRow(['Platform Overview', 'Total Registered Students', totalStudents]));
  rows.push(buildCsvRow(['Platform Overview', 'Total Applications Logged', totalApps]));

  // 2. Application Status Breakdown
  if (hasAppAnalytics) {
    for (const item of appAnalytics) {
      rows.push(buildCsvRow([
        'Application Status',
        item.status_name || 'Unknown',
        item.count ?? 0
      ]));
    }
  }

  // 3. In-Demand Skills Breakdown
  if (hasSkillAnalytics) {
    for (const item of skillAnalytics) {
      rows.push(buildCsvRow([
        'In-Demand Skill',
        item.skill_name || 'Unknown',
        item.count ?? 0
      ]));
    }
  }

  const filename = `careertrack-admin-analytics-${getTodayDateString()}.csv`;
  downloadCsv(filename, rows.join('\r\n'));

  return {
    success: true,
    rowCount: rows.length - 1
  };
}
