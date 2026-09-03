import React, { useState } from 'react';
import type { OtherInformationData, WellDocumentItem } from '../../../types/wellData';
import { documentService } from '../../../services/documentService';

interface OtherInformationCardsProps {
  data: OtherInformationData;
}

export const OtherInformationCards: React.FC<OtherInformationCardsProps> = ({ data }) => {
  const { mudProgram, casingProgram, cementingPractice, formationTops, lessonsLearned = [], documents = [] } = data;

  // Selected PDF Document for Modal Preview
  const [previewDocument, setPreviewDocument] = useState<WellDocumentItem | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      try {
        await documentService.uploadReport(e.target.files[0], 'NHK-09');
        alert('File uploaded successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to upload file');
      }
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      try {
        // Assuming we pick a ZIP for bulk, or a directory. The API expects a ZIP file.
        await documentService.uploadBulkArchive(e.target.files[0]);
        alert('Bulk upload started!');
      } catch (err) {
        console.error(err);
        alert('Failed to start bulk upload');
      }
    }
  };

  const handleSync = async () => {
    try {
      await documentService.syncDataLake();
      alert('Sync successful!');
    } catch (err) {
      console.error(err);
      alert('Failed to sync datalake');
    }
  };

  // Helper to handle document download
  const handleDownloadDocument = (doc: WellDocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Generate blob/text content for PDF download simulation
    const dummyPdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (${doc.title}) /Author (NWIS Platform) >>\nendobj\n% NWIS Report Download for ${doc.fileName}`;
    const blob = new Blob([dummyPdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* OTHER INFORMATION SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Other Information</h3>
          <span className="text-xs text-gray-500 font-medium">5 Key Operational Cards</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Mud Program */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Mud Program
            </h4>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 font-medium block">Weight</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{mudProgram.weight}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Type</span>
                <p className="font-semibold text-gray-900 mt-0.5">{mudProgram.type}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Casing Program */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Casing Program
            </h4>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 font-medium block">Surface Casing</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {casingProgram.surfaceCasing}
                </p>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Intermediate Casing</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {casingProgram.intermediateCasing}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Cementing Practice */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Cementing Practice
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400 font-medium block">Primary</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  Lead: <span className="font-bold">{cementingPractice.primaryLead}</span>
                </p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  Tail: <span className="font-bold">{cementingPractice.primaryTail}</span>
                </p>
              </div>
              <div className="pt-1">
                <span className="text-gray-400 font-medium block">Top of Cement</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {cementingPractice.topOfCement}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Formation Tops */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Formation Tops
            </h4>
            <div className="space-y-1.5 text-xs">
              {formationTops.map((top, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-0.5 ${
                    top.isPayZone ? 'font-extrabold text-[#FDB813]' : 'text-gray-700'
                  }`}
                >
                  <span className={top.isPayZone ? 'text-[#FDB813] font-bold' : 'text-gray-600'}>
                    {top.name}
                  </span>
                  <span className={top.isPayZone ? 'text-[#FDB813] font-bold' : 'text-gray-900 font-semibold'}>
                    {top.depth}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Lessons Learned */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-[#b78600] uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center justify-between">
              <span className="text-[#b78600] font-extrabold">Lessons Learned</span>
              <span className="text-[10px] bg-amber-50 text-[#b78600] px-1.5 py-0.5 rounded font-bold border border-amber-200/50">
                {lessonsLearned.length} Insights
              </span>
            </h4>
            <div className="space-y-2.5 text-xs max-h-[160px] overflow-y-auto pr-1">
              {lessonsLearned.length > 0 ? (
                lessonsLearned.map((item, idx) => (
                  <div key={idx} className="bg-amber-50/50 p-2 rounded-lg border border-amber-200/40 space-y-1">
                    <span className="font-bold text-[#b78600] text-[10.5px] block">{item.category}</span>
                    <p className="text-gray-800 text-[11px] leading-tight">{item.description}</p>
                    <p className="text-[#b78600] text-[10px] italic font-medium">💡 {item.recommendation}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-xs italic">No lessons recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENTS SECTION BOX */}
      <div id="reports-section" className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#D92D20] font-bold">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-none">Well Documents & Reports</h3>
              <span className="text-xs text-gray-500 font-medium mt-0.5 block">Access DDR (Daily Drilling Report), WCR (Well Completion Report) & Technical PDFs</span>
            </div>
          </div>
          <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-full">
            {documents.length} PDF Documents Available
          </span>
          <div className="flex flex-wrap gap-2 ml-4">
            <label className="cursor-pointer px-3 py-1 bg-black text-[#FDB813] text-xs font-bold rounded hover:bg-gray-800 transition flex items-center">
              UPLOAD REPORT
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            <label className="cursor-pointer px-3 py-1 border border-black/20 text-black text-xs font-bold rounded hover:bg-gray-50 transition flex items-center">
              BULK ZIP
              <input type="file" accept=".zip" className="hidden" onChange={handleBulkUpload} />
            </label>
            <button className="px-3 py-1 border border-black/20 text-black text-xs font-bold rounded hover:bg-gray-50 transition" onClick={handleSync}>
              SYNC DATALAKE
            </button>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.map((doc) => {
            const isDdr = doc.type === 'DDR';
            const isWcr = doc.type === 'WCR';
            const badgeColor = isDdr
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isWcr
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={doc.id}
                onClick={() => setPreviewDocument(doc)}
                className="bg-gray-50/70 hover:bg-white border border-gray-200 hover:border-[#D92D20] rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* PDF Red Badge Icon */}
                      <div className="w-8 h-8 rounded-md bg-red-500 text-white flex items-center justify-center font-bold text-[10px] tracking-tight shadow-xs">
                        PDF
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                          {doc.type}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{doc.dateAdded}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Edit document ${doc.id} functionality connected to documentService.updateDocument`);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-400 hover:bg-[#FDB813] hover:text-black transition-colors"
                        title="Edit Document"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDownloadDocument(doc, e)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-400 hover:bg-[#D92D20] hover:text-white transition-colors"
                        title="Download PDF"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-gray-400">{doc.fileSize}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#D92D20] transition-colors line-clamp-1">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-snug">
                      {doc.description}
                    </p>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-3 mt-3 border-t border-gray-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#D92D20] group-hover:underline flex items-center gap-1">
                    Preview PDF
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadDocument(doc, e)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Download Report PDF"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF PREVIEW MODAL */}
      {previewDocument && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{previewDocument.title}</h3>
                  <p className="text-xs text-gray-500">{previewDocument.fileName} • {previewDocument.fileSize}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Document Details Body */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 font-medium block">Document Type</span>
                  <p className="font-bold text-gray-900">{previewDocument.type} Report</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Date Added</span>
                  <p className="font-bold text-gray-900">{previewDocument.dateAdded}</p>
                </div>
              </div>

              <div>
                <span className="text-gray-400 font-medium block">Description & Scope</span>
                <p className="text-gray-700 mt-1 leading-relaxed">{previewDocument.description}</p>
              </div>

              {/* Simulated PDF Document Viewer Window */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center space-y-2 mt-2">
                <div className="w-12 h-12 bg-red-50 text-[#D92D20] rounded-full flex items-center justify-center mx-auto">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{previewDocument.fileName}</h4>
                <p className="text-xs text-gray-500">Official NWIS Platform Technical Document</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={(e) => handleDownloadDocument(previewDocument, e)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#D92D20] hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
