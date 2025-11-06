import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Upload, File, FileText, Table, Presentation, FileSpreadsheet, Image, Paperclip, Trash2, Download } from 'lucide-react';
import type { Task } from '../../types.ts';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string, files: File[], message?: string) => void;
  task: Task | null;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (['pdf'].includes(ext || '')) return <FileText className="text-red-500" size={24} />;
  if (['ppt', 'pptx'].includes(ext || '')) return <Presentation className="text-orange-500" size={24} />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-green-600" size={24} />;
  if (['doc', 'docx', 'txt'].includes(ext || '')) return <FileText className="text-blue-500" size={24} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <Image className="text-purple-500" size={24} />;
  if (['zip', 'rar', '7z'].includes(ext || '')) return <File className="text-gray-500" size={24} />;
  
  return <File className="text-gray-500" size={24} />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function CompleteTaskModal({ isOpen, onClose, onComplete, task }: CompleteTaskModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!task) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(withFiles: boolean) {
    if (withFiles && selectedFiles.length === 0) {
      alert('Please select at least one file to attach');
      return;
    }
    
    onComplete(task.id, withFiles ? selectedFiles : [], message.trim());
    setSelectedFiles([]);
    setMessage('');
    onClose();
  }

  function handleClose() {
    setSelectedFiles([]);
    setMessage('');
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card w-full max-w-2xl shadow-2xl my-8"
            >
              <div className="card-padding">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Complete Task</h3>
                      <p className="text-sm text-gray-600">{task.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    Would you like to complete this task with or without file attachments?
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <Paperclip size={14} />
                    <span>You can attach reports, documents, presentations, or any relevant files</span>
                  </div>
                </div>

                {/* Message/Comment */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 transition-colors"
                    rows={3}
                    placeholder="Add a note or comment about task completion..."
                  />
                </div>

                {/* File Upload Area */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Attach Files (Optional)
                  </label>
                  
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                      isDragging 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-300 hover:border-purple-400 bg-gray-50'
                    }`}
                  >
                    <Upload className={`mx-auto mb-3 ${isDragging ? 'text-purple-600' : 'text-gray-400'}`} size={40} />
                    <p className="text-sm text-gray-600 mb-2">
                      <label htmlFor="file-upload" className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer">
                        Click to upload
                      </label>
                      {' '}or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, PPTX, Excel, Word, Images, and more (Max 10MB per file)
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="*/*"
                    />
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Selected Files ({selectedFiles.length})
                      </p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="flex-shrink-0 p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                              title="Remove file"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleClose}
                    className="flex-1 btn btn-outline py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmit(false)}
                    className="flex-1 btn bg-gray-600 text-white hover:bg-gray-700 py-2.5 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Complete Without Files
                  </button>
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={selectedFiles.length === 0}
                    className="flex-1 btn btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={18} />
                    Complete With Files
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

