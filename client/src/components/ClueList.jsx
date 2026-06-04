import { useMemo } from 'react';

function ClueSection({ title, list, wordIndexMap, selectedWord, onSelectWord }) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      <ul className="space-y-0.5">
        {list.map(word => {
          const idx = wordIndexMap.get(word);
          const active = idx === selectedWord;
          return (
            <li
              key={`${word.direction}-${word.number}`}
              onClick={() => onSelectWord(idx)}
              className={`cursor-pointer rounded px-2 py-1 text-sm leading-tight ${
                active ? 'bg-blue-100 font-semibold text-blue-800' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className="font-bold mr-1">{word.number}.</span>
              {word.clue}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ClueList({ words, selectedWord, onSelectWord }) {
  if (!words) return null;

  const across = words.filter(w => w.direction === 'across');
  const down = words.filter(w => w.direction === 'down');

  // Stable object-identity map from word → index. Memoized because words is
  // the same array reference for the lifetime of a puzzle.
  const wordIndexMap = useMemo(() => new Map(words.map((w, i) => [w, i])), [words]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <ClueSection title="Across" list={across} wordIndexMap={wordIndexMap} selectedWord={selectedWord} onSelectWord={onSelectWord} />
      <ClueSection title="Down" list={down} wordIndexMap={wordIndexMap} selectedWord={selectedWord} onSelectWord={onSelectWord} />
    </div>
  );
}
