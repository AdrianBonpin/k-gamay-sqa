import { classNames } from '@/lib/utils';

interface Props {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

export function CategoryChips({ categories, active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Menu categories"
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap"
    >
      {categories.map((cat) => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat)}
            className={classNames('chip whitespace-nowrap', isActive ? 'chip-active' : 'chip-idle')}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
