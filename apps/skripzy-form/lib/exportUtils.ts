import { FormResponse, FormTemplate } from './types';

export function exportToCSV(template: FormTemplate, responses: FormResponse[], filename: string = 'export.csv') {
  const headers = ['Respondent ID', 'Timestamp'];
  const allQuestionIds: string[] = [];

  template.sections.forEach(section => {
    section.items.forEach(item => {
      if (item.type !== 'info') {
        headers.push(`${section.name} - ${item.text}`);
        allQuestionIds.push(item.id);
      }
    });
  });

  const rows = [headers];

  responses.forEach(res => {
    const rowData: string[] = [res.id, new Date(res.timestamp).toLocaleString()];
    allQuestionIds.forEach(qId => {
      const val = res.answers[qId];
      if (Array.isArray(val)) {
        rowData.push(val.join('; '));
      } else {
        rowData.push(val?.toString() || '');
      }
    });
    rows.push(rowData);
  });

  const csvContent = rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
