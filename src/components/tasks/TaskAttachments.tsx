import { motion } from 'framer-motion';
import { Download, FileText, Presentation, FileSpreadsheet, Image, File, Paperclip } from 'lucide-react';
import type { TaskAttachment } from '../../types.ts';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (['pdf'].includes(ext || '')) return <FileText className="text-red-500" size={20} />;
  if (['ppt', 'pptx'].includes(ext || '')) return <Presentation className="text-orange-500" size={20} />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-green-600" size={20} />;
  if (['doc', 'docx', 'txt'].includes(ext || '')) return <FileText className="text-blue-500" size={20} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <Image className="text-purple-500" size={20} />;
  
  return <File className="text-gray-500" size={20} />;
}

function handleDownload(attachment: TaskAttachment) {
  // For demo purposes, create a blob URL from the base64 data
  try {
    // If URL is already a blob or http URL, use it directly
    if (attachment.url.startsWith('blob:') || attachment.url.startsWith('http')) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // If it's base64, convert and download
    if (attachment.url.includes('base64,')) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    alert('Error downloading file. Please try again.');
  }
}

export function TaskAttachments({ attachments }: TaskAttachmentsProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip size={14} className="text-purple-600" />
        <span className="text-xs font-semibold text-gray-700">
          {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {attachments.map((attachment, index) => (
          <motion.div
            key={attachment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors group border border-gray-200"
          >
            <div className="flex-shrink-0">
              {getFileIcon(attachment.fileName)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-gray-900 break-words leading-tight" title={attachment.fileName}>
                {attachment.fileName}
              </p>
            </div>
            <button
              onClick={() => handleDownload(attachment)}
              className="flex-shrink-0 p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
              title="Download file"
            >
              <Download size={16} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

