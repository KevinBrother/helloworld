type WireFieldProps = {
  label: string;
  value?: string;
  placeholder?: string;
};

export function WireField({ label, value, placeholder = 'Input placeholder' }: WireFieldProps) {
  return (
    <label className="wire-field">
      <span>{label}</span>
      <input value={value ?? ''} placeholder={placeholder} readOnly />
    </label>
  );
}
