interface BackupKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupPrivKeyshare: string | null;
}

export const BackupKeyModal = ({ isOpen, onClose, backupPrivKeyshare }: BackupKeyModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Backup Private Key Share</h2>
        <div className="mb-6">
          <p className="text-red-600 font-bold mb-2">⚠️ Important: Store this backup key share in a safe place!</p>
          <p className="mb-4 text-sm text-gray-700">
            This backup key share is essential for wallet recovery. You will lose access to your assets if lost.
            Take a screenshot or save it in a secure location.
          </p>
          <div className="p-3 bg-gray-100 rounded-lg break-all font-mono text-sm mb-4">
            {backupPrivKeyshare}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Backup Complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupKeyModal; 