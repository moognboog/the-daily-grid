import { useState } from 'react';

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Daily Crossword</h1>
        <p className="text-gray-500 mb-6">Enter your name to start playing</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={24}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-lg focus:outline-none focus:border-blue-500 mb-4"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Let's go
          </button>
        </form>
      </div>
    </div>
  );
}
