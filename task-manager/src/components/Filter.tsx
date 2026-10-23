import type { Filter as FilterValue } from '../types/todo';

const OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'done', label: 'Done' },
];

interface FilterProps {
  value: FilterValue;
  counts: Record<FilterValue, number>;
  onChange: (value: FilterValue) => void;
}

function Filter({ value, counts, onChange }: FilterProps) {
  return (
    <div className="filter" role="group" aria-label="Filter by status">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`filter__button${option.value === value ? ' filter__button--active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          <span className="filter__count">{counts[option.value]}</span>
        </button>
      ))}
    </div>
  );
}

export default Filter;
