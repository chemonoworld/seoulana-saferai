import { useState } from 'react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string, apiKey?: string) => void;
  title: string;
  buttonText: string;
  needsApiKey?: boolean;
}

const PasswordModal = ({ isOpen, onClose, onConfirm, title, buttonText, needsApiKey = false }: PasswordModalProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!password) {
      setError('Please enter password.');
      return;
    }

    if (title.includes('Set') && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (needsApiKey && !apiKey) {
      setError('Please enter your OpenAI API key.');
      return;
    }

    onConfirm(password, needsApiKey ? apiKey : undefined);
    setPassword('');
    setConfirmPassword('');
    setApiKey('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {title.includes('Set') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {needsApiKey && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-..."
            />
            <p className="mt-1 text-xs text-gray-500">
              The API key will be encrypted and stored locally.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal; 