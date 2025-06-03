"use client";
import React, { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';

type ReportFormat = "pdf" | "word" | "excel";
type ReportType = "all_assets" | "asset_assignments" | "asset_status_summary"; // Add more types

interface ReportParams {
  format: ReportFormat;
  type: ReportType;
  orgId: string; // Added orgId
  // Add other params like date ranges, status filters etc.
  dateFrom?: string;
  dateTo?: string;
  statusFilter?: string;
}

export default function ReportsPage() {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>("all_assets");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleGenerateReport = async () => {
    if (!organization) {
      setError("No organization selected. Please select an organization first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    console.log('[ReportsPage] Organization context before API call:', organization); // DEBUG LOG
    if (organization) {
      console.log('[ReportsPage] organization.id:', organization.id); // DEBUG LOG
    }

    const reportParams: ReportParams = {
      format: reportFormat,
      type: reportType,
      orgId: organization.id, // Explicitly send organization.id
      dateFrom: dateFrom || undefined, // Send undefined if empty
      dateTo: dateTo || undefined,   // Send undefined if empty
      // ...other params
    };

    console.log('[ReportsPage] Sending reportParams:', reportParams); // Added log

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/octet-stream' },
        body: JSON.stringify(reportParams),
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `Failed to generate report. Server responded with ${response.status}` }));
        throw new Error(errData.message || `Report generation failed with status: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `report.${reportFormat}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Report "${filename}" generated and download started.`);

    } catch (err: any) {
      console.error("Report generation error:", err);
      setError(err.message || "An unexpected error occurred during report generation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Generate Reports</h1>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">{error}</div>}
      {successMessage && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">{successMessage}</div>}
      
      <div className="bg-white dark:bg-gray-800 border  rounded-2xl p-6 space-y-6">
        <div>
          <label htmlFor="reportType" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Report Type</label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="all_assets">All Assets List</option>
            <option value="asset_assignments">Asset Assignments</option>
            <option value="asset_status_summary">Asset Status Summary</option>
            {/* Add more report types here */}
          </select>
        </div>

        <div>
          <label htmlFor="reportFormat" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Report Format</label>
          <div className="flex space-x-2">
            {(["pdf", "word", "excel"] as ReportFormat[]).map(fmt => (
                 <button
                    key={fmt}
                    onClick={() => setReportFormat(fmt)}
                    className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium
                                ${reportFormat === fmt 
                                    ? 'bg-primary text-white border-primary dark:bg-primary dark:border-primary' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                 >
                    {fmt === 'pdf' && <FileType size={16} className="mr-2"/>}
                    {fmt === 'word' && <FileText size={16} className="mr-2"/>}
                    {fmt === 'excel' && <FileSpreadsheet size={16} className="mr-2"/>}
                    {fmt.toUpperCase()}
                 </button>
            ))}
          </div>
        </div>

        {/* Date Range Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="dateFrom" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Date From</label>
            <input 
              type="date" 
              id="dateFrom" 
              name="dateFrom" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Date To</label>
            <input 
              type="date" 
              id="dateTo" 
              name="dateTo" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isLoading || !organization}
          className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 disabled:bg-gray-400 dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-800 dark:disabled:bg-gray-500"
        >
          <Download size={18} className="mr-2" />
          {isLoading ? 'Generating Report...' : `Generate ${reportFormat.toUpperCase()} Report`}
        </button>
        {!organization && <p className="text-xs text-yellow-600 mt-2">Please ensure an organization is active to generate reports.</p>}
      </div>

       {/* <div className="bg-white dark:bg-gray-800 border rounded-2xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About Report Generation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                This section uses an API to generate reports in your chosen format.
                The actual document creation (PDF, Word, Excel) from data would typically involve:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Fetching the relevant data from the database based on your selected report type and filters.</li>
                <li>
                    Formatting this data appropriately. For complex formats like PDF and Word, this often involves using libraries 
                    (e.g., <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">pdf-lib</code>, <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">docx</code>) or a templating engine.
                    For Excel, libraries like <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">exceljs</code> are common.
                </li>
                <li>
                    If using an AI service like Gemini, you would send the structured data to the Gemini API with a prompt
                    instructing it to generate the content in the desired format (e.g., "Generate a PDF report summarizing these assets...").
                    The AI might return structured text, markdown, or in some cases, directly a file or base64 encoded file content if the API supports it.
                    This usually requires careful prompt engineering.
                </li>
                <li>The backend API then sends the generated file back to your browser for download.</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                The current implementation sets up the client-side request and placeholder for backend processing.
                You would need to build out the <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">/api/reports/generate</code> endpoint
                with your chosen data fetching and document generation logic.
            </p>
        </div> */}

    </div>
  );
}