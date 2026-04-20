import { formatTimeInput } from '../utils/helpers';

export default function TimeInput({ value, onChange, className = '', ...props }) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder={props.placeholder || 'HH:MM'}
      value={value || ''}
      onChange={e => onChange(formatTimeInput(e.target.value))}
      className={className}
    />
  );
}
