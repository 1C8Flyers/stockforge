import dashboardHelp from './pages/dashboard.md?raw';
import shareholdersHelp from './pages/shareholders.md?raw';
import lotsHelp from './pages/lots.md?raw';
import transfersHelp from './pages/transfers.md?raw';
import meetingsHelp from './pages/meetings.md?raw';
import reportsHelp from './pages/reports.md?raw';
import auditHelp from './pages/audit-log.md?raw';
import adminHelp from './pages/admin.md?raw';
import userManualHelp from './pages/user-manual.md?raw';

const helpByPath: Record<string, string> = {
  '/': dashboardHelp,
  '/shareholders': shareholdersHelp,
  '/lots': lotsHelp,
  '/transfers': transfersHelp,
  '/meetings': meetingsHelp,
  '/reports': reportsHelp,
  '/audit-log': auditHelp,
  '/admin': adminHelp,
  '/user-manual': userManualHelp
};

export function getHelpMarkdown(path: string) {
  return helpByPath[path] || '';
}
