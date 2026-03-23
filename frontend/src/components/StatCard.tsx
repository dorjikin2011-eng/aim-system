import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'gray';
  onClick?: () => void;
}

export default function StatCard({ title, value, icon, color = 'blue', onClick }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-50 text-gray-700'
  };

  return (
    <div 
      className={`rounded-lg shadow p-4 cursor-pointer transition hover:shadow-md ${colorClasses[color]}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-md ${color === 'red' ? 'bg-red-100' : color === 'green' ? 'bg-green-100' : 'bg-blue-100'}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}