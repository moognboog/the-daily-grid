import { fmt } from '../utils/format.js';

export default function Timer({ elapsed }) {
  return (
    <div className="text-lg font-mono font-semibold text-gray-700">
      {fmt(elapsed)}
    </div>
  );
}
