// frontend/src/pages/prevention/components/SummaryCards.tsx
import type { CardData } from '../hooks/usePreventionData';

interface Props {
  data: CardData[]; // ✅ Must have property name "data"
  onSelectCard: (key: string) => void;
  activeCard: string | null;
}

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  AWAITING_VALIDATION: 'bg-blue-100 text-blue-800',
  FINALIZED: 'bg-green-100 text-green-800',
  ASSIGNED: 'bg-gray-100 text-gray-800'
};

export default function SummaryCards({ data, onSelectCard, activeCard }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {data.map(card => (
        <div 
          key={card.key}
          onClick={() => onSelectCard(card.key)}
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${
            activeCard === card.key ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <h3 className="text-sm font-medium text-gray-600">{card.label}</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          {card.key !== 'ASSIGNED' && (
            <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${statusColors[card.key]}`}>
              {card.key.replace('_', ' ').toLowerCase()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}